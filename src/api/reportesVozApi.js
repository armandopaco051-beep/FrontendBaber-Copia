import api from './axiosConfig';

async function requestWith404Fallback(primaryEndpoint, requestFactory, fallbackEndpoint) {
  console.log('[REPORTES VOZ] calling endpoint', primaryEndpoint);
  try {
    const response = await requestFactory(primaryEndpoint);
    console.log('[REPORTES VOZ] response', response.data);
    return response;
  } catch (error) {
    if (error.response?.status !== 404 || !fallbackEndpoint) {
      throw error;
    }

    console.log('[REPORTES VOZ] calling endpoint', fallbackEndpoint);
    const response = await requestFactory(fallbackEndpoint);
    console.log('[REPORTES VOZ] response', response.data);
    return response;
  }
}

export function interpretarReportePorVoz(audio) {
  const formData = new FormData();
  formData.append('audio', audio);

  console.log('[REPORTES VOZ] calling endpoint', '/reportes/voz/');
  return api.post('/reportes/voz/', formData, {
    headers: {
      'Content-Type': undefined,
    },
    transformRequest: [(data, headers) => {
      if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
      return data;
    }],
  }).then((response) => {
    console.log('[REPORTES VOZ] response', response.data);
    return response;
  }).catch((error) => {
    if (error.response?.status === 404) {
      const notFoundError = new Error('No se encontró el endpoint de voz en el backend local. Verifique que Django esté ejecutando el código actualizado.');
      notFoundError.response = {
        status: 404,
        data: {
          error: 'No se encontró el endpoint de voz en el backend local. Verifique que Django esté ejecutando el código actualizado.',
        },
      };
      throw notFoundError;
    }
    throw error;
  });
}

export function interpretarReportePorTexto(consulta) {
  return requestWith404Fallback(
    '/reportes/voz/texto/',
    (endpoint) => api.post(endpoint, { consulta }),
    '/reportes/debug/voz/texto/',
  );
}

export function diagnosticarReporteVoz() {
  return requestWith404Fallback(
    '/reportes/voz/diagnostico/',
    (endpoint) => api.get(endpoint),
    '/reportes/debug/voz/diagnostico/',
  );
}
