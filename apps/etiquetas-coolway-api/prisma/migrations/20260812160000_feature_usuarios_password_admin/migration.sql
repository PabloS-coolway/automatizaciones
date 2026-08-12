-- MEJ · Nueva feature «usuarios.password» (cambiar la contraseña de usuarios), separada de «usuarios.gestionar».
-- Se la sumamos al rol de sistema ADMIN (que ya podía resetear contraseñas). Idempotente.
UPDATE "role"
   SET features = array_append(features, 'usuarios.password')
 WHERE key = 'admin'
   AND NOT ('usuarios.password' = ANY(features));
