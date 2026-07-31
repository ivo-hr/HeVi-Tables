import { createClient } from "npm:@supabase/supabase-js@2.109.0";
import webpush from "npm:web-push@3.6.7";

type NotificationRecord = {
  id: string;
  user_id: string;
  group_id: string | null;
  table_id: string | null;
  title: string;
  body: string;
};

type WebhookPayload = {
  type: "INSERT";
  schema: "public";
  table: "notificaciones";
  record: NotificationRecord;
};

function notificationUrl(record: NotificationRecord) {
  if (record.group_id && record.table_id) {
    return `/grupos/${record.group_id}/tablas/${record.table_id}`;
  }
  return record.group_id ? `/grupos/${record.group_id}` : "/";
}

Deno.serve(async (request) => {
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-hevi-webhook-secret") !== webhookSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !vapidSubject ||
    !vapidPublicKey ||
    !vapidPrivateKey
  ) {
    return Response.json({ error: "Push secrets are incomplete" }, { status: 503 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    payload.type !== "INSERT" ||
    payload.table !== "notificaciones" ||
    !payload.record?.user_id
  ) {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", payload.record.user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const message = JSON.stringify({
    title: payload.record.title,
    body: payload.record.body,
    tag: `hevi-${payload.record.id}`,
    url: notificationUrl(payload.record)
  });
  const expiredEndpoints: string[] = [];
  const results = await Promise.allSettled(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          message,
          {
            TTL: 86_400,
            urgency: "normal",
            vapidDetails: {
              subject: vapidSubject,
              publicKey: vapidPublicKey,
              privateKey: vapidPrivateKey
            }
          }
        );
      } catch (sendError) {
        const statusCode = (sendError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscription.endpoint);
          return;
        }
        throw sendError;
      }
    })
  );

  if (expiredEndpoints.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return Response.json({
    delivered: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
    expired: expiredEndpoints.length
  });
});
