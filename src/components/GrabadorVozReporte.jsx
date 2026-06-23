import { useEffect, useMemo, useRef, useState } from 'react';

import { interpretarReportePorVoz } from '../api/reportesVozApi';
import { formatApiError } from '../utils/apiError';

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
];

function detectarMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return '';
  }

  return MIME_TYPES.find((mimeType) => window.MediaRecorder.isTypeSupported?.(mimeType)) || '';
}

function extensionDesdeMime(mimeType) {
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export default function GrabadorVozReporte({ onResultado }) {
  const mimeType = useMemo(() => detectarMimeType(), []);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const cancelarRef = useRef(false);

  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => {
    detenerStream();
  }, []);

  const detenerStream = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const reiniciarEstado = () => {
    chunksRef.current = [];
    cancelarRef.current = false;
    mediaRecorderRef.current = null;
    setGrabando(false);
    setProcesando(false);
  };

  const iniciarGrabacion = async () => {
    if (!mimeType || grabando || procesando) return;

    try {
      setError('');
      setMensaje('');
      cancelarRef.current = false;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new window.MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const chunks = [...chunksRef.current];
        const fueCancelado = cancelarRef.current;

        detenerStream();
        mediaRecorderRef.current = null;
        setGrabando(false);

        if (fueCancelado) {
          reiniciarEstado();
          setMensaje('');
          setError('');
          return;
        }

        if (!chunks.length) {
          reiniciarEstado();
          setError('No se pudo obtener audio valido para procesar.');
          return;
        }

        try {
          const blob = new Blob(chunks, { type: mimeType });
          const extension = extensionDesdeMime(mimeType);
          const audio = new File([blob], `reporte-voz.${extension}`, { type: mimeType });
          const response = await interpretarReportePorVoz(audio);
          await onResultado?.(response.data);
          setMensaje('Comando interpretado...');
          setError('');
        } catch (requestError) {
          setError(formatApiError(requestError.response?.data, 'No se pudo procesar la grabacion.'));
          setMensaje('');
        } finally {
          reiniciarEstado();
        }
      };

      mediaRecorder.start();
      setGrabando(true);
      setMensaje('Grabando...');
    } catch {
      detenerStream();
      reiniciarEstado();
      setError('No se pudo acceder al micrófono. Pruebe desde Chrome móvil con HTTPS o use la prueba por texto.');
      setMensaje('');
    }
  };

  const detenerYProcesar = () => {
    if (!mediaRecorderRef.current || !grabando || procesando) return;
    setProcesando(true);
    setMensaje('Procesando voz...');
    mediaRecorderRef.current.stop();
  };

  const cancelarGrabacion = () => {
    cancelarRef.current = true;

    if (mediaRecorderRef.current && grabando) {
      mediaRecorderRef.current.stop();
      return;
    }

    detenerStream();
    reiniciarEstado();
    setMensaje('');
    setError('');
  };

  if (!mimeType) {
    return <div className="ventas-caja-empty">Tu navegador no soporta grabación de voz con MediaRecorder. Use la prueba por texto.</div>;
  }

  return (
    <div className="reportes-voz-controls">
      <div className="reportes-voz-actions">
        <button className="btn-gold" type="button" onClick={iniciarGrabacion} disabled={grabando || procesando}>
          Iniciar grabacion
        </button>
        <button className="btn-outline" type="button" onClick={detenerYProcesar} disabled={!grabando || procesando}>
          Detener y procesar
        </button>
        <button className="btn-outline" type="button" onClick={cancelarGrabacion} disabled={procesando}>
          Cancelar
        </button>
      </div>

      {mensaje ? <div className="reportes-voz-status">{mensaje}</div> : null}
      {error ? <div className="reportes-voz-error">{error}</div> : null}
    </div>
  );
}
