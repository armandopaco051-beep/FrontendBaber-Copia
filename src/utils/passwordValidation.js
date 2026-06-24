export function validarPasswordFuerte(password) {
  const errores = [];
  if (!password || password.length < 8) errores.push('minimo 8 caracteres');
  if (!/[A-Z]/.test(password || '')) errores.push('una letra mayuscula');
  if (!/[a-z]/.test(password || '')) errores.push('una letra minuscula');
  if (!/[0-9]/.test(password || '')) errores.push('un numero');
  if (!/[^A-Za-z0-9]/.test(password || '')) errores.push('un caracter especial');
  return errores;
}

export function mensajePasswordFuerte(password) {
  const errores = validarPasswordFuerte(password);
  if (errores.length === 0) return '';
  return `La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial. Falta: ${errores.join(', ')}.`;
}
