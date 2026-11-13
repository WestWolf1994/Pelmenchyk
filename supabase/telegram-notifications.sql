-- Telegram order notifications for Supabase.
-- Run this AFTER supabase/schema.sql in Supabase SQL Editor.
-- Keep the bot token and chat ID in Supabase Vault; never put them in website JS or Git.
-- Add Vault secrets named telegram_bot_token and telegram_chat_id before testing.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_telegram_order()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_token text;
  v_chat_id text;
  v_text text;
  v_item jsonb;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'telegram_bot_token'
  limit 1;

  select decrypted_secret into v_chat_id
  from vault.decrypted_secrets
  where name = 'telegram_chat_id'
  limit 1;

  if coalesce(v_token, '') = '' or coalesce(v_chat_id, '') = '' then
    raise warning 'Telegram notification skipped: add telegram_bot_token and telegram_chat_id to Supabase Vault';
    return new;
  end if;

  v_text := 'Нове замовлення ' || new.number || E'\n' ||
    'Ім’я: ' || new.name || E'\n' ||
    'Телефон: ' || new.phone || E'\n' ||
    'Отримання: ' || case when new.delivery = 'delivery' then 'Доставка' else 'Самовивіз' end || E'\n';

  if new.delivery = 'delivery' and coalesce(new.address, '') <> '' then
    v_text := v_text || 'Адреса: ' || new.address || E'\n';
  end if;

  v_text := v_text || E'\nПозиції:\n';
  for v_item in select value from jsonb_array_elements(new.items)
  loop
    v_text := v_text || '• ' || coalesce(v_item->>'name', 'Страва') ||
      ' × ' || coalesce(v_item->>'qty', '1') ||
      ' — ' || coalesce(v_item->>'sum', '0') || ' ₴' || E'\n';
  end loop;

  v_text := v_text || E'\nРазом: ' || new.total || ' ₴' || E'\n' ||
    'Оплата: ' || case when new.payment_method = 'online' then 'Онлайн' else 'Готівка / при отриманні' end;

  if coalesce(new.comment, '') <> '' then
    v_text := v_text || E'\nКоментар: ' || new.comment;
  end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('chat_id', v_chat_id, 'text', v_text)
  );

  return new;
end;
$$;

revoke all on function public.notify_telegram_order() from public, anon, authenticated;

drop trigger if exists orders_telegram_notification on public.orders;
create trigger orders_telegram_notification
  after insert on public.orders
  for each row execute function public.notify_telegram_order();
