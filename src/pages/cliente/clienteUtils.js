export function normalizarLista(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export function formatApiError(data, fallback = 'Ocurrio un error.') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (data.mensaje) return data.mensaje;

  return Object.entries(data)
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' | ') || fallback;
}

export function nombrePersona(item) {
  if (!item) return '-';
  if (typeof item === 'string') return item;
  return `${item.nombre || ''} ${item.apellido || ''}`.trim() || item.correo || item.codigo || '-';
}

export function valorCodigo(valor) {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'object') return valor;
  return valor.codigo || valor.codigo_usuario || valor.codigo_barbero || valor.id_usuario || valor.id || '';
}

export function idServicio(servicio) {
  return servicio?.id_servicio || servicio?.id || '';
}

export function codigoBarbero(barbero) {
  return valorCodigo(barbero?.codigo_barbero)
    || valorCodigo(barbero?.codigo_usuario)
    || valorCodigo(barbero?.codigo)
    || valorCodigo(barbero?.barbero)
    || valorCodigo(barbero?.usuario)
    || valorCodigo(barbero?.id_barbero)
    || valorCodigo(barbero?.id_usuario)
    || valorCodigo(barbero?.id)
    || '';
}

export function idCita(cita) {
  return cita?.id_cita || cita?.id || '';
}

export function fechaCita(cita) {
  return String(cita?.fecha || cita?.fecha_cita || cita?.fecha_inicio || '').slice(0, 10);
}

export function horaCita(cita) {
  return String(cita?.hora_inicio || cita?.hora || cita?.inicio || '').slice(0, 5);
}

export function estadoCita(cita) {
  return cita?.estado || cita?.id_estadoc?.nombre || cita?.estado_cita || 'Pendiente';
}

export function servicioCita(cita) {
  const servicio = cita?.id_servicio || cita?.servicio;
  if (servicio && typeof servicio === 'object') return servicio.nombre || servicio.servicio || '-';
  return cita?.servicio_nombre || cita?.nombre_servicio || '-';
}

export function barberoCita(cita) {
  const barbero = cita?.codigo_barbero || cita?.id_barbero || cita?.barbero;
  return nombrePersona(barbero);
}

export function estadoClase(estado) {
  const valor = String(estado || '').toLowerCase();
  if (valor.includes('confirm')) return 'badge-green';
  if (valor.includes('pend')) return 'badge-yellow';
  if (valor.includes('cancel') || valor.includes('anul') || valor.includes('no asist')) return 'badge-red';
  return 'badge-blue';
}
