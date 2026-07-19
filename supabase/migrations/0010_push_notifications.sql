-- Token de notificaciones push (Expo Push Token) por usuario. Se guarda
-- solo el último (cada dispositivo/login lo sobrescribe); suficiente para
-- este alcance ya que cada cuenta la usa una sola persona.
alter table profiles add column push_token text;
