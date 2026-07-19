-- Descuento por pagar en efectivo (editable desde Empresa → Tarifas).
alter table pricing_config add column cash_discount_rate numeric not null default 0.10;
