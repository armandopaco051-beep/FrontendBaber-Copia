import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ENDPOINT = 'servicios/portafolio-trabajos/';
const EMPTY = {
  id_servicio: '',
  id_atencion: '',
  descripcion: '',
  estilo: '',
  imagen: null,
  referencia: '',
  estado: 'PENDIENTE',
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

function id(trabajo) {
  return trabajo?.id_trabajo || trabajo?.id || '';
}

function badge(estado) {
  if (estado === 'APROBADO') return 'badge-green';
  if (estado === 'RECHAZADO' || estado === 'INACTIVO') return 'badge-red';
  return 'badge-yellow';
}

// Caso de uso: Gestionar portafolio de trabajos realizados.
// Barberos registran trabajos con imagen real; administradores revisan aprobando, rechazando o inactivando.
export default function PortafolioTrabajos() {
  const [items, setItems] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [revision, setRevision] = useState({ estado: 'APROBADO', observacion_revision: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    try {
      const response = await api.get(ENDPOINT, { params: filtro ? { estado: filtro } : {} });
      setItems(normalizarLista(response.data, 'trabajos'));
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cargar portafolio.'), 'error');
    }
  };

  const cargarServicios = async () => {
    try {
      const response = await api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } });
      setServicios(normalizarLista(response.data, 'servicios'));
    } catch {
      setServicios([]);
    }
  };

  useEffect(() => { cargarServicios(); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [filtro]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setSelected(null);
    setForm({ ...EMPTY });
    setRevision({ estado: 'APROBADO', observacion_revision: '' });
  };

  const abrirCrear = () => {
    setForm({ ...EMPTY });
    setModal('form');
  };

  const abrirEditar = (trabajo) => {
    setSelected(trabajo);
    setForm({
      id_servicio: trabajo.id_servicio || '',
      id_atencion: trabajo.id_atencion || '',
      descripcion: trabajo.descripcion || '',
      estilo: trabajo.estilo || '',
      imagen: null,
      referencia: trabajo.referencia || '',
      estado: trabajo.estado || 'PENDIENTE',
    });
    setModal('form');
  };

  // CREATE/UPDATE: usa FormData para enviar el campo imagen como archivo multipart.
  const guardar = async () => {
    if (!form.id_servicio || !form.descripcion.trim() || !form.estilo.trim()) {
      return showToast('Completa servicio, descripcion y estilo.', 'error');
    }

    const data = new FormData();
    data.append('id_servicio', Number(form.id_servicio));
    data.append('descripcion', form.descripcion.trim());
    data.append('estilo', form.estilo.trim());
    data.append('referencia', form.referencia.trim());
    data.append('estado', form.estado);
    if (form.id_atencion) data.append('id_atencion', Number(form.id_atencion));
    if (form.imagen) data.append('imagen', form.imagen);

    setLoading(true);
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (selected) {
        await api.put(`${ENDPOINT}${id(selected)}/`, data, config);
      } else {
        await api.post(ENDPOINT, data, config);
      }
      showToast('Trabajo guardado correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar trabajo.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const revisar = async () => {
    setLoading(true);
    try {
      await api.post(`${ENDPOINT}${id(selected)}/revisar/`, revision);
      showToast('Trabajo revisado correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo revisar trabajo.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return items.filter(trabajo => [
      id(trabajo),
      trabajo.barbero,
      trabajo.servicio,
      trabajo.descripcion,
      trabajo.estilo,
      trabajo.estado,
    ].some(value => String(value || '').toLowerCase().includes(q)));
  }, [buscar, items]);

  return (
    <div>
      <div className="card">
        <div className="cu-header">
          <div>
            <h3>Portafolio de trabajos</h3>
            <p>Gestiona trabajos realizados y su revision para publicacion.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Nuevo trabajo</button>
        </div>

        <div className="cu-toolbar">
          <div className="search-box cu-search">
            <span className="icon">Buscar</span>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por barbero, servicio o estilo" />
          </div>
          <select className="input-field" value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="APROBADO">APROBADO</option>
            <option value="RECHAZADO">RECHAZADO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        <div className="portfolio-grid">
          {filtrados.length === 0 ? (
            <p className="cu-empty">No hay trabajos.</p>
          ) : filtrados.map(trabajo => (
            <article key={id(trabajo)} className="portfolio-card">
              {trabajo.imagen_url && <img src={trabajo.imagen_url} alt={trabajo.estilo} />}
              <strong>{trabajo.estilo}</strong>
              <span>{trabajo.servicio} - {trabajo.barbero}</span>
              <p>{trabajo.descripcion}</p>
              <span className={`badge ${badge(trabajo.estado)}`}>{trabajo.estado}</span>
              <div className="cu-actions">
                <button className="btn-outline" onClick={() => abrirEditar(trabajo)}>Editar</button>
                <button className="btn-gold" onClick={() => { setSelected(trabajo); setModal('revision'); }}>Revisar</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {modal === 'form' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box cu-modal" onClick={e => e.stopPropagation()}>
            <h3>{selected ? 'Editar' : 'Nuevo'} trabajo</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Servicio</label>
                <select className="input-field" value={form.id_servicio} onChange={e => setForm({ ...form, id_servicio: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {servicios.map(servicio => <option key={servicio.id_servicio || servicio.id} value={servicio.id_servicio || servicio.id}>{servicio.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Id atencion</label>
                <input className="input-field" value={form.id_atencion} onChange={e => setForm({ ...form, id_atencion: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Estilo</label>
              <input className="input-field" value={form.estilo} onChange={e => setForm({ ...form, estilo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Imagen</label>
              <input className="input-field" type="file" accept="image/*" onChange={e => setForm({ ...form, imagen: e.target.files?.[0] || null })} />
              <span className="cu-muted">Formatos permitidos por el navegador: imagenes JPG, PNG, WEBP, GIF y otros tipos image/*.</span>
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field cu-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Referencia</label>
              <textarea className="input-field cu-textarea" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} />
            </div>
            <div className="cu-actions">
              <button className="btn-outline" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold" onClick={guardar} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'revision' && selected && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box cu-modal" onClick={e => e.stopPropagation()}>
            <h3>Revisar trabajo #{id(selected)}</h3>
            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={revision.estado} onChange={e => setRevision({ ...revision, estado: e.target.value })}>
                <option value="APROBADO">APROBADO</option>
                <option value="RECHAZADO">RECHAZADO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
            <div className="form-group">
              <label>Observacion</label>
              <textarea className="input-field cu-textarea" value={revision.observacion_revision} onChange={e => setRevision({ ...revision, observacion_revision: e.target.value })} />
            </div>
            <div className="cu-actions">
              <button className="btn-outline" onClick={cerrar}>Cancelar</button>
              <button className="btn-gold" onClick={revisar} disabled={loading}>Guardar revision</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
