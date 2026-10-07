/**
 * Traduce los códigos de AuthJS (`error` y `code`, tanto del query string de
 * `/auth/signin` como del resultado de `signIn(..., { redirect: false })`)
 * a mensajes amigables en español.
 *
 * - Credenciales inválidas → `error=CredentialsSignin` (+ `code` propio si el
 *   `authorize` lanza una subclase de `CredentialsSignin`, ver lib/auth.ts).
 * - Cualquier excepción no prevista en el servidor → `error=Configuration`.
 */
export function authErrorMessage(
  error?: string | null,
  code?: string | null,
): string {
  if (code) {
    switch (code) {
      case "INVALID_CREDENTIALS":
        return "Email o contraseña incorrectos";
      case "EMAIL_ALREADY_REGISTERED":
        return "Este email ya está registrado";
      case "INVALID_SIGNUP_DATA":
        return "Datos no válidos: revisa el email y la contraseña";
    }
  }

  switch (error) {
    case "CredentialsSignin":
      return "Email o contraseña incorrectos";
    case "Configuration":
      return "Error de configuración del servidor, inténtalo más tarde";
    case "AccessDenied":
      return "No tienes permiso para acceder";
    case "SessionRequired":
      return "Inicia sesión para continuar";
    case null:
    case undefined:
    case "":
      return "";
    default:
      return "Error al iniciar sesión, inténtalo más tarde";
  }
}
