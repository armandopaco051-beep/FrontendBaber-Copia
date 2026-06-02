import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

const ESTADOS = ['ACTIVO', 'PROGRAMADA', 'INACTIVO'];
const TIPOS = ['PORCENTAJE', 'MONTO'];
const EMPTY = {
  nombre: '',
  descripcion: '',
  tipo_descuento: 'PORCENTAJE',
  valor_descuento: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'PROGRAMADA',
  servicios: [],
};

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{type === 'success' ? 'OK' : 'Error'} {msg}</div>;
}

function normalizarLista(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idPromocion(item) {
  return item?.id_promocion || item?.id || '';
}

function idServicio(item) {
  return item?.id_servicio || item?.id || '';
}

function nombreServicio(item) {
  return item?.servicio || item?.nombre || '-';
}

function estadoClase(promocion) {
  if (promocion?.estado === 'INACTIVO') return 'badge-red';
  if (promocion?.vigente_hoy) return 'badge-green';
  return 'badge-yellow';
}

function estadoTexto(promocion) {
  if (promocion?.estado === 'INACTIVO') return 'Inactivo';
  if (promocion?.vigente_hoy) return 'Activo vigente';
  if (promocion?.estado === 'ACTIVO') return 'Activo';
  return 'Programada';
}

function valorPromocion(promocion) {
  if (promocion?.tipo_descuento === 'MONTO') return `Bs. ${promocion?.valor_descuento}`;
  return `${promocion?.valor_descuento}%`;
}

function serviciosDePromocion(promocion) {
  return Array.isArray(promocion?.servicios_detalle) ? promocion.servicios_detalle : [];
}

export default function Promociones() {
  const [promociones, setPromociones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    const [promocionesRes, serviciosRes] = await Promise.allSettled([
      api.get('citas/promociones/'),
      api.get('servicios/servicios/', { params: { estado: 'ACTIVO' } }),
    ]);

    if (promocionesRes.status === 'fulfilled') {
      setPromociones(normalizarLista(promocionesRes.value.data, ['promociones']));
    }
    if (serviciosRes.status === 'fulfilled') {
      setServicios(normalizarLista(serviciosRes.value.data, ['servicios']));
    }
    if (promocionesRes.status === 'rejected' || serviciosRes.status === 'rejected') {
      showToast('No se pudieron cargar promociones o servicios.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cerrar = () => {
    setModal(null);
    setEditId(null);
    setForm({ ...EMPTY });
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setModal('crear');
  };

  const abrirEditar = (promocion) => {
    setEditId(idPromocion(promocion));
    setForm({
      nombre: promocion?.nombre || '',
      descripcion: promocion?.descripcion || '',
      tipo_descuento: promocion?.tipo_descuento || 'PORCENTAJE',
      valor_descuento: promocion?.valor_descuento || '',
      fecha_inicio: promocion?.fecha_inicio || '',
      fecha_fin: promocion?.fecha_fin || '',
      estado: promocion?.estado || 'PROGRAMADA',
      servicios: Array.isArray(promocion?.servicios)
        ? promocion.servicios.map(item => String(item))
        : serviciosDePromocion(promocion).map(item => String(item?.id_servicio || idServicio(item))),
    });
    setModal('editar');
  };

  const toggleServicio = (servicioId) => {
    const valor = String(servicioId);
    setForm(prev => ({
      ...prev,
      servicios: prev.servicios.includes(valor)
        ? prev.servicios.filter(item => item !== valor)
        : [...prev.servicios, valor],
    }));
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showToast('El nombre es obligatorio.', 'error');
    if (!form.fecha_inicio || !form.fecha_fin) return showToast('Debes seleccionar el rango de fechas.', 'error');
    if (form.servicios.length === 0) return showToast('Selecciona al menos un servicio activo.', 'error');

    const payload = {
      ...form,
      valor_descuento: form.valor_descuento,
      servicios: form.servicios.map(item => Number(item)),
    };

    setLoading(true);
    try {
      if (modal === 'crear') {
        await api.post('citas/promociones/', payload);
        showToast('Promocion registrada correctamente.');
      } else {
        await api.put(`citas/promociones/${editId}/`, payload);
        showToast('Promocion actualizada correctamente.');
      }
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo guardar la promocion.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async (promocion) => {
    if (!confirm(`Desactivar la promocion "${promocion.nombre}"?`)) return;
    try {
      await api.delete(`citas/promociones/${idPromocion(promocion)}/`);
      showToast('Promocion desactivada correctamente.');
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo desactivar la promocion.'), 'error');
    }
  };

  const promocionesFiltradas = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return promociones;

    return promociones.filter(promocion => [
      promocion?.nombre,
      promocion?.descripcion,
      promocion?.estado,
      promocion?.tipo_descuento,
      ...serviciosDePromocion(promocion).map(item => nombreServicio(item)),
    ].some(valor => String(valor || '').toLowerCase().includes(q)));
  }, [buscar, promociones]);

  const totalVigentes = promociones.filter(item => item?.vigente_hoy).length;
  const totalActivas = promociones.filter(item => item?.estado === 'ACTIVO').length;
  const totalProgramadas = promociones.filter(item => item?.estado === 'PROGRAMADA').length;

  return (
    <div>
      <div className="promociones-stats">
        <div className="stat-card">
          <div className="label">Promociones</div>
          <div className="value">{promociones.length}</div>
          <div className="sub">Registradas</div>
        </div>
        <div className="stat-card">
          <div className="label">Activas</div>
          <div className="value gold">{totalActivas}</div>
          <div className="sub">En catalogo</div>
        </div>
        <div className="stat-card">
          <div className="label">Vigentes hoy</div>
          <div className="value">{totalVigentes}</div>
          <div className="sub">Aplicables</div>
        </div>
        <div className="stat-card">
          <div className="label">Programadas</div>
          <div className="value">{totalProgramadas}</div>
          <div className="sub">Pendientes</div>
        </div>
      </div>

      <div className="card">
        <div className="promociones-header">
          <div>
            <h3 className="promociones-title">Gestion de promociones</h3>
            <p className="promociones-subtitle">Registra descuentos, vigencias y servicios asociados sin alterar el flujo de caja.</p>
          </div>
          <button className="btn-gold" onClick={abrirCrear}>Registrar promocion</button>
        </div>

        <div className="search-box promociones-search">
          <span className="icon">Buscar</span>
          <input
            placeholder="Buscar por nombre, estado o servicio..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>

        <table className="tabla">
          <thead>
            <tr>
              <th>Promocion</th>
              <th>Descuento</th>
              <th>Vigencia</th>
              <th>Servicios</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promocionesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="promociones-empty">No hay promociones registradas.</td>
              </tr>
            ) : promocionesFiltradas.map(promocion => (
              <tr key={idPromocion(promocion)}>
                <td>
                  <div className="promociones-name">{promocion.nombre}</div>
                  <div className="promociones-muted">{promocion.descripcion || 'Sin descripcion'}</div>
                </td>
                <td>
                  <div className="promociones-name">{promocion.tipo_descuento}</div>
                  <div className="promociones-muted">{valorPromocion(promocion)}</div>
                </td>
                <td>
                  <div className="promociones-name">{promocion.fecha_inicio}</div>
                  <div className="promociones-muted">Hasta {promocion.fecha_fin}</div>
                </td>
                <td>
                  <div className="promociones-services">
                    {serviciosDePromocion(promocion).map(servicio => (
                      <span key={`${idPromocion(promocion)}-${idServicio(servicio)}`}>{nombreServicio(servicio)}</span>
                    ))}
                  </div>
                </td>
                <td><span className={`badge ${estadoClase(promocion)}`}>{estadoTexto(promocion)}</span></td>
                <td className="promociones-row-actions">
                  <button className="btn-outline" onClick={() => abrirEditar(promocion)}>Editar</button>
                  <button className="btn-outline promociones-delete" onClick={() => desactivar(promocion)} disabled={promocion?.estado === 'INACTIVO'}>
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box promociones-modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'crear' ? 'Registrar promocion' : 'Editar promocion'}</h3>
            <p>Asocia uno o mas servicios activos, define el descuento y controla su vigencia.</p>

            <div className="form-group">
              <label>Nombre</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Promo estudiante" />
            </div>

            <div className="form-group">
              <label>Descripcion</label>
              <textarea className="input-field promociones-textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle de la promocion" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo de descuento</label>
                <select className="input-field" value={form.tipo_descuento} onChange={e => setForm({ ...form, tipo_descuento: e.target.value })}>
                  {TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Valor del descuento</label>
                <input className="input-field" type="number" min="0" step="0.01" value={form.valor_descuento} onChange={e => setForm({ ...form, valor_descuento: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha inicio</label>
                <input className="input-field" type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fecha fin</label>
                <input className="input-field" type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select className="input-field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Servicios asociados</label>
              <div className="promociones-checkbox-grid">
                {servicios.map(servicio => {
                  const id = String(idServicio(servicio));
                  const checked = form.servicios.includes(id);
                  return (
                    <label key={id} className={`promociones-service-item ${checked ? 'active' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleServicio(id)} />
                      <span>{servicio.nombre}</span>
                      <small>{servicio.duracion_minutos || 0} min</small>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="promociones-modal-actions">
              <button className="btn-outline promociones-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline promociones-modal-button" onClick={() => setForm({ ...EMPTY })}>Limpiar</button>
              <button className="btn-gold promociones-modal-button" onClick={guardar} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
