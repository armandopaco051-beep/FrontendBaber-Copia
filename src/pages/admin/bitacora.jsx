import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';

function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.bitacora)) return data.bitacora;
  return [];
}

function texto(valor) {
  return String(valor ?? '').toLowerCase();
}

function tipoAccion(registro) {
  const combinado = `${texto(registro.accion)} ${texto(registro.descripcion)}`;

  if (
    combinado.includes('login') ||
    combinado.includes('ingreso') ||
    combinado.includes('entrada') ||
    combinado.includes('iniciar sesion') ||
    combinado.includes('inicio sesion')
  ) {
    return 'entrada';
  }

  if (
    combinado.includes('logout') ||
    combinado.includes('salida') ||
    combinado.includes('cerrar sesion') ||
    combinado.includes('cierre sesion')
  ) {
    return 'salida';
  }

  return 'accion';
}

function formatearFecha(valor) {
  if (!valor) return '-';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;

  return fecha.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function metodoClase(metodo = '') {
  return `bitacora-method bitacora-method-${metodo.toLowerCase() || 'default'}`;
}

export default function Bitacora() {
  const [registros, setRegistros] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarBitacora = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('seguridad/bitacora/');
      setRegistros(normalizarLista(response.data));
    } catch (err) {
      const mensaje = err.response?.data?.detail || err.response?.data?.error || 'No se pudo cargar la bitacora.';
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarBitacora(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const metricas = useMemo(() => {
    const entradas = registros.filter(registro => tipoAccion(registro) === 'entrada').length;
    const salidas = registros.filter(registro => tipoAccion(registro) === 'salida').length;

    return {
      total: registros.length,
      entradas,
      salidas,
      acciones: registros.length - entradas - salidas,
    };
  }, [registros]);

  const filtrados = useMemo(() => {
    const termino = texto(buscar);

    return registros.filter(registro => {
      const tipo = tipoAccion(registro);
      const coincideFiltro = filtro === 'todos' || tipo === filtro;
      const coincideBusqueda = [
        registro.id,
        registro.codigo_usuario,
        registro.accion,
        registro.descripcion,
        registro.metodo,
        registro.ruta,
        registro.ip,
        registro.fecha,
      ].some(valor => texto(valor).includes(termino));

      return coincideFiltro && coincideBusqueda;
    });
  }, [buscar, filtro, registros]);

  return (
    <div>
      <div className="bitacora-stats">
        <div className="stat-card">
          <div className="label">Registros</div>
          <div className="value">{metricas.total}</div>
          <div className="sub">Eventos guardados</div>
        </div>
        <div className="stat-card">
          <div className="label">Entradas</div>
          <div className="value gold">{metricas.entradas}</div>
          <div className="sub">Inicio de sesion</div>
        </div>
        <div className="stat-card">
          <div className="label">Salidas</div>
          <div className="value">{metricas.salidas}</div>
          <div className="sub">Cierre de sesion</div>
        </div>
        <div className="stat-card">
          <div className="label">Acciones</div>
          <div className="value">{metricas.acciones}</div>
          <div className="sub">Otros movimientos</div>
        </div>
      </div>

      <div className="card">
        <div className="bitacora-header">
          <div>
            <h3 className="bitacora-title">Bitacora del sistema</h3>
            <p className="bitacora-subtitle">Controla entradas, salidas y acciones realizadas por los usuarios.</p>
          </div>
          <button className="btn-gold" onClick={cargarBitacora} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="bitacora-toolbar">
          <div className="search-box bitacora-search">
            <span className="icon">Buscar</span>
            <input
              placeholder="Buscar por usuario, accion, ruta o IP..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
          </div>

          <select className="input-field bitacora-filter" value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="accion">Otras acciones</option>
          </select>
        </div>

        {error && <div className="bitacora-error">{error}</div>}

        <div className="bitacora-table-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Metodo</th>
                <th>Ruta</th>
                <th>IP</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading && registros.length === 0 ? (
                <tr><td colSpan={7} className="bitacora-empty">Cargando bitacora...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="bitacora-empty">No se encontraron registros.</td></tr>
              ) : filtrados.map(registro => (
                <tr key={registro.id}>
                  <td className="bitacora-id">#{registro.id}</td>
                  <td className="bitacora-user">{registro.codigo_usuario || '-'}</td>
                  <td>
                    <span className={`bitacora-action bitacora-action-${tipoAccion(registro)}`}>
                      {registro.accion || '-'}
                    </span>
                    <div className="bitacora-description">{registro.descripcion || 'Sin descripcion'}</div>
                  </td>
                  <td>
                    <span className={metodoClase(registro.metodo)}>{registro.metodo || '-'}</span>
                  </td>
                  <td className="bitacora-route">{registro.ruta || '-'}</td>
                  <td>{registro.ip || '-'}</td>
                  <td className="bitacora-date">{formatearFecha(registro.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
