import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENCUESTAS_ENDPOINT = 'cliente/encuestas/';
const ESTADOS = ['BORRADOR', 'ACTIVO', 'INACTIVO'];
const TIPOS_RESPUESTA = ['ESCALA', 'OPCION_UNICA', 'TEXTO'];
const EMPTY = {
  titulo: '',
  descripcion: '',
  estado: 'BORRADOR',
  preguntas: [],
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function idEncuesta(encuesta) {
  return encuesta?.id_encuesta || encuesta?.id || '';
}

function preguntasEncuesta(encuesta) {
  return Array.isArray(encuesta?.preguntas) ? encuesta.preguntas : [];
}

function opcionesPregunta(pregunta) {
  return Array.isArray(pregunta?.opciones) ? pregunta.opciones : [];
}

function formatoFecha(valor) {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
}

function estadoClase(estado) {
  if (estado === 'ACTIVO') return 'badge-green';
  if (estado === 'INACTIVO') return 'badge-red';
  return 'badge-yellow';
}

function estadoTexto(estado) {
  if (estado === 'ACTIVO') return 'Activo';
  if (estado === 'INACTIVO') return 'Inactivo';
  return 'Borrador';
}

function tipoTexto(tipo) {
  if (tipo === 'OPCION_UNICA') return 'Opcion unica';
  if (tipo === 'TEXTO') return 'Texto';
  return 'Escala';
}

function opcionesPorDefecto(tipo) {
  if (tipo === 'TEXTO') return [];
  if (tipo === 'OPCION_UNICA') {
    return [
      { texto: 'Si', valor: 1, orden: 1 },
      { texto: 'No', valor: 2, orden: 2 },
    ];
  }
  return [1, 2, 3, 4, 5].map(valor => ({ texto: String(valor), valor, orden: valor }));
}

function nuevaPregunta(orden) {
  return {
    texto: '',
    tipo_respuesta: 'ESCALA',
    orden,
    obligatoria: true,
    opciones: opcionesPorDefecto('ESCALA'),
  };
}

function prepararPreguntas(preguntas) {
  return preguntas.map((pregunta, index) => ({
    texto: pregunta.texto.trim(),
    tipo_respuesta: pregunta.tipo_respuesta,
    orden: index + 1,
    obligatoria: Boolean(pregunta.obligatoria),
    opciones: pregunta.tipo_respuesta === 'TEXTO'
      ? []
      : opcionesPregunta(pregunta).map((opcion, optionIndex) => ({
        texto: String(opcion.texto || '').trim(),
        valor: opcion.valor === '' || opcion.valor === null || opcion.valor === undefined ? null : Number(opcion.valor),
        orden: optionIndex + 1,
      })),
  }));
}

// CU30: Gestionar encuestas de satisfaccion.
// Conecta con cliente/encuestas/ para administrar encuestas completas con preguntas y opciones.
export default function EncuestasSatisfaccion() {
  const [encuestas, setEncuestas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // READ: obtiene encuestas del modulo cliente aplicando filtro de estado si corresponde.
  const cargar = async () => {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.get(ENCUESTAS_ENDPOINT, { params });
      setEncuestas(normalizarLista(response.data, 'encuestas'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar las encuestas.'), 'error');
    }
  };

  useEffect(() => { cargar(); }, [filtroEstado]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setDetalle(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY, preguntas: [nuevaPregunta(1)] });
    setModal('crear');
  };

  const abrirEditar = (encuesta) => {
    setEditId(idEncuesta(encuesta));
    setForm({
      titulo: encuesta?.titulo || '',
      descripcion: encuesta?.descripcion || '',
      estado: encuesta?.estado || 'BORRADOR',
      preguntas: preguntasEncuesta(encuesta).map((pregunta, index) => ({
        texto: pregunta.texto || '',
        tipo_respuesta: pregunta.tipo_respuesta || 'ESCALA',
        orden: pregunta.orden || index + 1,
        obligatoria: pregunta.obligatoria !== false,
        opciones: opcionesPregunta(pregunta).map((opcion, optionIndex) => ({
          texto: opcion.texto || '',
          valor: opcion.valor ?? '',
          orden: opcion.orden || optionIndex + 1,
        })),
      })),
    });
    setModal('editar');
  };

  const abrirDetalle = (encuesta) => {
    setDetalle(encuesta);
    setModal('detalle');
  };

  const actualizarPregunta = (index, campo, valor) => {
    setForm(actual => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta, i) => {
        if (i !== index) return pregunta;
        if (campo === 'tipo_respuesta') {
          return { ...pregunta, tipo_respuesta: valor, opciones: opcionesPorDefecto(valor) };
        }
        return { ...pregunta, [campo]: valor };
      }),
    }));
  };

  const agregarPregunta = () => {
    setForm(actual => ({ ...actual, preguntas: [...actual.preguntas, nuevaPregunta(actual.preguntas.length + 1)] }));
  };

  const quitarPregunta = (index) => {
    setForm(actual => ({ ...actual, preguntas: actual.preguntas.filter((_, i) => i !== index) }));
  };

  const actualizarOpcion = (preguntaIndex, opcionIndex, campo, valor) => {
    setForm(actual => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta, i) => i === preguntaIndex ? {
        ...pregunta,
        opciones: opcionesPregunta(pregunta).map((opcion, j) => j === opcionIndex ? { ...opcion, [campo]: valor } : opcion),
      } : pregunta),
    }));
  };

  const agregarOpcion = (preguntaIndex) => {
    setForm(actual => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta, i) => {
        if (i !== preguntaIndex) return pregunta;
        const orden = opcionesPregunta(pregunta).length + 1;
        return { ...pregunta, opciones: [...opcionesPregunta(pregunta), { texto: '', valor: orden, orden }] };
      }),
    }));
  };

  const quitarOpcion = (preguntaIndex, opcionIndex) => {
    setForm(actual => ({
      ...actual,
      preguntas: actual.preguntas.map((pregunta, i) => i === preguntaIndex ? {
        ...pregunta,
        opciones: opcionesPregunta(pregunta).filter((_, j) => j !== opcionIndex),
      } : pregunta),
    }));
  };

  function validarFormulario(payload) {
    if (!payload.titulo) return 'El titulo de la encuesta es obligatorio.';
    if (!payload.preguntas.length) return 'La encuesta debe tener al menos una pregunta.';
    const preguntaInvalida = payload.preguntas.find(pregunta => !pregunta.texto);
    if (preguntaInvalida) return 'Todas las preguntas deben tener texto.';
    const preguntaSinOpciones = payload.preguntas.find(pregunta => pregunta.tipo_respuesta !== 'TEXTO' && pregunta.opciones.length === 0);
    if (preguntaSinOpciones) return 'Las preguntas de escala u opcion unica deben tener opciones.';
    const opcionInvalida = payload.preguntas.find(pregunta => pregunta.tipo_respuesta !== 'TEXTO' && pregunta.opciones.some(opcion => !opcion.texto));
    if (opcionInvalida) return 'Todas las opciones deben tener texto.';
    return null;
  }

  // CREATE/UPDATE: envia la estructura completa aceptada por EncuestaSatisfaccionSerializer.
  const guardar = async () => {
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      estado: form.estado,
      preguntas: prepararPreguntas(form.preguntas),
    };
    const errorValidacion = validarFormulario(payload);
    if (errorValidacion) return showToast(errorValidacion, 'error');

    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post(ENCUESTAS_ENDPOINT, payload);
        showToast('Encuesta de satisfaccion registrada correctamente.');
      } else {
        await api.put(`${ENCUESTAS_ENDPOINT}${editId}/`, payload);
        showToast('Encuesta de satisfaccion actualizada correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la encuesta.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // DELETE logico: conserva la encuesta y la marca como INACTIVO en el backend.
  const inactivar = async (encuesta) => {
    if (!confirm(`Inactivar la encuesta "${encuesta.titulo}"?`)) return;
    try {
      await api.delete(`${ENCUESTAS_ENDPOINT}${idEncuesta(encuesta)}/`);
      showToast('Encuesta de satisfaccion inactivada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo inactivar la encuesta.'), 'error');
    }
  };

  // ACTIVATE: publica una encuesta usando el endpoint especifico del CU30.
  const activar = async (encuesta) => {
    try {
      await api.post(`${ENCUESTAS_ENDPOINT}${idEncuesta(encuesta)}/activar/`);
      showToast('Encuesta de satisfaccion activada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo activar la encuesta.'), 'error');
    }
  };

  const encuestasFiltradas = useMemo(() => {
    const q = buscar.toLowerCase();
    return encuestas.filter(encuesta => [
      idEncuesta(encuesta),
      encuesta?.titulo,
      encuesta?.descripcion,
      encuesta?.estado,
      encuesta?.fecha_registro,
      ...preguntasEncuesta(encuesta).map(pregunta => pregunta.texto),
    ].some(valor => String(valor ?? '').toLowerCase().includes(q)));
  }, [buscar, encuestas]);

  const activas = encuestas.filter(item => item.estado === 'ACTIVO').length;
  const borradores = encuestas.filter(item => item.estado === 'BORRADOR').length;
  const inactivas = encuestas.filter(item => item.estado === 'INACTIVO').length;

  return (
    <div>
      <div className="encuestas-stats">
        <div className="stat-card">
          <div className="label">Encuestas</div>
          <div className="value">{encuestas.length}</div>
          <div className="sub">Registradas</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{activas}</div>
          <div className="sub">Disponibles para clientes</div>
        </div>
        <div className="stat-card">
          <div className="label">Borradores</div>
          <div className="value">{borradores}</div>
          <div className="sub">En preparacion</div>
        </div>
        <div className="stat-card">
          <div className="label">Inactivas</div>
          <div className="value">{inactivas}</div>
          <div className="sub">Retiradas</div>
        </div>
      </div>

      <div className="card">
        <div className="encuestas-header">
          <div>
            <h3 className="encuestas-title">Gestion de encuestas de satisfaccion</h3>
            <p className="encuestas-subtitle">Administra encuestas completas con preguntas y opciones de respuesta.</p>
          </div>
          <div className="encuestas-actions">
            <button className="btn-outline" onClick={cargar}>Actualizar</button>
            <button className="btn-gold" onClick={abrirCrear}>Nueva encuesta</button>
          </div>
        </div>

        <div className="encuestas-toolbar">
          <div className="search-box encuestas-search">
            <span className="icon">Buscar</span>
            <input placeholder="Buscar por titulo, estado o pregunta" value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="form-group encuestas-filter">
            <label>Estado</label>
            <select className="input-field" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map(estado => <option key={estado} value={estado}>{estadoTexto(estado)}</option>)}
            </select>
          </div>
        </div>

        <div className="encuestas-table-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Encuesta</th><th>Descripcion</th><th>Preguntas</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {encuestasFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="encuestas-empty">No se encontraron encuestas de satisfaccion.</td></tr>
              ) : encuestasFiltradas.map(encuesta => (
                <tr key={idEncuesta(encuesta)}>
                  <td>
                    <div className="encuestas-name">{encuesta.titulo}</div>
                    <div className="encuestas-muted">#{idEncuesta(encuesta)}</div>
                  </td>
                  <td>{encuesta.descripcion || 'Sin descripcion'}</td>
                  <td>{preguntasEncuesta(encuesta).length}</td>
                  <td><span className={`badge ${estadoClase(encuesta.estado)}`}>{estadoTexto(encuesta.estado)}</span></td>
                  <td>{formatoFecha(encuesta.fecha_registro)}</td>
                  <td className="encuestas-row-actions">
                    <button className="btn-outline" onClick={() => abrirDetalle(encuesta)}>Ver</button>
                    <button className="btn-outline" onClick={() => abrirEditar(encuesta)}>Editar</button>
                    {encuesta.estado === 'ACTIVO' ? (
                      <button className="btn-outline encuestas-delete" onClick={() => inactivar(encuesta)}>Inactivar</button>
                    ) : (
                      <button className="btn-gold" onClick={() => activar(encuesta)}>Activar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box encuestas-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Nueva encuesta de satisfaccion' : 'Editar encuesta de satisfaccion'}</h3>
            <p>Define la encuesta, sus preguntas y las opciones requeridas por cada tipo de respuesta.</p>
            <div className="form-group">
              <label>Titulo</label>
              <input className="input-field" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Encuesta post atencion" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  {ESTADOS.map(estado => <option key={estado} value={estado}>{estadoTexto(estado)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Preguntas</label>
                <button className="btn-outline encuestas-add-button" onClick={agregarPregunta}>Agregar pregunta</button>
              </div>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field encuestas-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Objetivo de la encuesta" />
            </div>

            <div className="encuestas-question-list">
              {form.preguntas.map((pregunta, preguntaIndex) => (
                <div key={preguntaIndex} className="encuestas-question-card">
                  <div className="encuestas-question-head">
                    <strong>Pregunta {preguntaIndex + 1}</strong>
                    <button className="btn-outline encuestas-delete" onClick={() => quitarPregunta(preguntaIndex)} disabled={form.preguntas.length === 1}>Quitar</button>
                  </div>
                  <div className="form-group">
                    <label>Texto de la pregunta</label>
                    <input className="input-field" value={pregunta.texto} onChange={e => actualizarPregunta(preguntaIndex, 'texto', e.target.value)} placeholder="Ej: Como calificas la puntualidad?" />
                  </div>
                  <div className="encuestas-question-grid">
                    <div className="form-group">
                      <label>Tipo de respuesta</label>
                      <select className="input-field" value={pregunta.tipo_respuesta} onChange={e => actualizarPregunta(preguntaIndex, 'tipo_respuesta', e.target.value)}>
                        {TIPOS_RESPUESTA.map(tipo => <option key={tipo} value={tipo}>{tipoTexto(tipo)}</option>)}
                      </select>
                    </div>
                    <label className="encuestas-check">
                      <input type="checkbox" checked={pregunta.obligatoria} onChange={e => actualizarPregunta(preguntaIndex, 'obligatoria', e.target.checked)} />
                      Obligatoria
                    </label>
                  </div>

                  {pregunta.tipo_respuesta !== 'TEXTO' && (
                    <div className="encuestas-options">
                      <div className="encuestas-options-head">
                        <span>Opciones</span>
                        <button className="btn-outline" onClick={() => agregarOpcion(preguntaIndex)}>Agregar opcion</button>
                      </div>
                      {opcionesPregunta(pregunta).map((opcion, opcionIndex) => (
                        <div key={opcionIndex} className="encuestas-option-row">
                          <input className="input-field" value={opcion.texto} onChange={e => actualizarOpcion(preguntaIndex, opcionIndex, 'texto', e.target.value)} placeholder="Texto" />
                          <input className="input-field" type="number" value={opcion.valor ?? ''} onChange={e => actualizarOpcion(preguntaIndex, opcionIndex, 'valor', e.target.value)} placeholder="Valor" />
                          <button className="btn-outline encuestas-delete" onClick={() => quitarOpcion(preguntaIndex, opcionIndex)}>Quitar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="encuestas-modal-actions">
              <button className="btn-outline encuestas-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline encuestas-modal-button" onClick={() => setForm({ ...EMPTY, preguntas: [nuevaPregunta(1)] })}>Limpiar</button>
              <button className="btn-gold encuestas-modal-button" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detalle' && detalle && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box encuestas-modal" onClick={e => e.stopPropagation()}>
            <h3>Detalle de encuesta</h3>
            <p>Estructura completa de preguntas y opciones registradas.</p>
            <div className="encuestas-detail-grid">
              {[
                ['Codigo', `#${idEncuesta(detalle)}`],
                ['Titulo', detalle.titulo],
                ['Estado', estadoTexto(detalle.estado)],
                ['Preguntas', preguntasEncuesta(detalle).length],
                ['Registro', formatoFecha(detalle.fecha_registro)],
                ['Actualizacion', formatoFecha(detalle.fecha_actualizacion)],
              ].map(([label, value]) => (
                <div key={label} className="encuestas-detail-row">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
            <div className="encuestas-detail-block">
              <span>Descripcion</span>
              <strong>{detalle.descripcion || 'Sin descripcion'}</strong>
            </div>
            <div className="encuestas-detail-questions">
              <h4>Preguntas</h4>
              {preguntasEncuesta(detalle).map((pregunta, index) => (
                <div key={pregunta.id_pregunta || index} className="encuestas-detail-question">
                  <strong>{index + 1}. {pregunta.texto}</strong>
                  <span>{tipoTexto(pregunta.tipo_respuesta)} - {pregunta.obligatoria ? 'Obligatoria' : 'Opcional'}</span>
                  {opcionesPregunta(pregunta).length > 0 && (
                    <div className="encuestas-option-chips">
                      {opcionesPregunta(pregunta).map(opcion => <em key={opcion.id_opcion || opcion.orden}>{opcion.texto}{opcion.valor ? ` (${opcion.valor})` : ''}</em>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-gold encuestas-modal-button" onClick={cerrar}>Cerrar</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
