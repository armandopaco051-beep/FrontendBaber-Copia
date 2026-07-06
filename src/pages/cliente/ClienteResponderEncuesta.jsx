import { useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from './clienteUtils';

const EMPTY_RESPUESTA = { id_pregunta: '', id_opcion: '', respuesta_texto: '', valor: '' };

// Caso de uso: Responder encuesta de satisfaccion.
// El backend solo expone POST; por eso el formulario permite cargar ids de encuesta, atencion, preguntas y opciones.
export default function ClienteResponderEncuesta() {
  const [form, setForm] = useState({ id_encuesta: '', id_atencion: '', respuestas: [{ ...EMPTY_RESPUESTA }] });
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const actualizar = (index, cambios) => setForm(actual => ({ ...actual, respuestas: actual.respuestas.map((r, i) => i === index ? { ...r, ...cambios } : r) }));
  const agregar = () => setForm(actual => ({ ...actual, respuestas: [...actual.respuestas, { ...EMPTY_RESPUESTA }] }));
  const quitar = (index) => setForm(actual => ({ ...actual, respuestas: actual.respuestas.filter((_, i) => i !== index) }));

  // POST: envia respuestas al endpoint cliente/encuestas/responder/ con la estructura del serializer.
  const responder = async () => {
    if (!form.id_encuesta || !form.id_atencion) return setMensaje('Debes indicar encuesta y atencion.');
    const respuestas = form.respuestas.map(r => {
      const item = { id_pregunta: Number(r.id_pregunta) };
      if (r.id_opcion) item.id_opcion = Number(r.id_opcion);
      if (r.respuesta_texto.trim()) item.respuesta_texto = r.respuesta_texto.trim();
      if (r.valor !== '') item.valor = Number(r.valor);
      return item;
    });
    if (respuestas.some(r => !r.id_pregunta)) return setMensaje('Cada respuesta debe tener id de pregunta.');
    setLoading(true);
    try {
      await api.post('cliente/encuestas/responder/', { id_encuesta: Number(form.id_encuesta), id_atencion: Number(form.id_atencion), respuestas });
      setMensaje('Encuesta respondida correctamente.');
      setForm({ id_encuesta: '', id_atencion: '', respuestas: [{ ...EMPTY_RESPUESTA }] });
    } catch (e) {
      setMensaje(formatApiError(e.response?.data, 'No se pudo responder la encuesta.'));
    } finally {
      setLoading(false);
    }
  };

  return <div className="cliente-page"><div className="card"><div className="cliente-section-header"><div><h3>Responder encuesta de satisfaccion</h3><p>Ingresa los identificadores indicados por la encuesta activa recibida.</p></div></div>{mensaje && <div className={`cliente-alert ${mensaje.includes('correctamente') ? 'success' : 'error'}`}>{mensaje}</div>}<div className="form-row"><div className="form-group"><label>Id encuesta</label><input className="input-field" value={form.id_encuesta} onChange={e => setForm({ ...form, id_encuesta: e.target.value })} /></div><div className="form-group"><label>Id atencion finalizada</label><input className="input-field" value={form.id_atencion} onChange={e => setForm({ ...form, id_atencion: e.target.value })} /></div></div><div className="cliente-section-header"><h3>Respuestas</h3><button className="btn-outline" onClick={agregar}>Agregar respuesta</button></div><div className="cliente-answer-list">{form.respuestas.map((r, i) => <div key={i} className="cliente-answer-row"><input className="input-field" placeholder="Id pregunta" value={r.id_pregunta} onChange={e => actualizar(i, { id_pregunta: e.target.value })} /><input className="input-field" placeholder="Id opcion" value={r.id_opcion} onChange={e => actualizar(i, { id_opcion: e.target.value })} /><input className="input-field" placeholder="Valor" value={r.valor} onChange={e => actualizar(i, { valor: e.target.value })} /><input className="input-field" placeholder="Respuesta texto" value={r.respuesta_texto} onChange={e => actualizar(i, { respuesta_texto: e.target.value })} />{form.respuestas.length > 1 && <button className="btn-outline" onClick={() => quitar(i)}>Quitar</button>}</div>)}</div><button className="btn-gold cliente-submit-wide" onClick={responder} disabled={loading}>{loading ? 'Enviando...' : 'Enviar encuesta'}</button></div></div>;
}
