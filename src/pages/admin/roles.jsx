import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { formatApiError } from '../../utils/apiError';

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

function idRol(rol) {
  return rol?.id || rol?.id_rol || '';
}

function normalizarModulo(modulo) {
  return String(modulo || 'general').replace(/_/g, ' ');
}

function accionOrden(accion) {
  const orden = ['ver', 'crear', 'editar', 'eliminar', 'asignar_permisos', 'exportar'];
  const index = orden.indexOf(String(accion || '').toLowerCase());
  return index === -1 ? 99 : index;
}

function etiquetaPermiso(permiso) {
  return permiso?.nombre || permiso?.codigo || '';
}

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [selectedRol, setSelectedRol] = useState(null);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
  const [modulosAbiertos, setModulosAbiertos] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargar = async () => {
    const [rolesRes, permisosRes] = await Promise.allSettled([
      api.get('seguridad/roles/'),
      api.get('seguridad/permisos/'),
    ]);

    if (rolesRes.status === 'fulfilled') setRoles(normalizarLista(rolesRes.value.data, 'roles'));
    if (permisosRes.status === 'fulfilled') setPermisos(normalizarLista(permisosRes.value.data, 'permisos'));

    if (rolesRes.status === 'rejected' || permisosRes.status === 'rejected') {
      showToast('No se pudieron cargar roles o permisos.', 'error');
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const permisosPorModulo = useMemo(() => {
    const grupos = permisos.reduce((acc, permiso) => {
      const modulo = permiso.modulo || String(permiso.codigo || '').split('.')[0] || 'general';
      if (!acc[modulo]) acc[modulo] = [];
      acc[modulo].push(permiso);
      return acc;
    }, {});

    return Object.entries(grupos)
      .map(([modulo, lista]) => ({
        modulo,
        permisos: lista.sort((a, b) => accionOrden(a.accion) - accionOrden(b.accion) || String(a.codigo).localeCompare(String(b.codigo))),
      }))
      .sort((a, b) => a.modulo.localeCompare(b.modulo));
  }, [permisos]);

  const cerrar = () => {
    setModal(null);
    setForm({ nombre: '' });
  };

  const abrirCrear = () => {
    setForm({ nombre: '' });
    setModal('crear');
  };

  const guardarRol = async () => {
    if (!form.nombre.trim()) return showToast('El nombre del rol es obligatorio.', 'error');
    setLoading(true);
    try {
      const response = await api.post('seguridad/roles/', { nombre: form.nombre.trim() });
      showToast(response.data?.mensaje || 'Rol creado correctamente.');
      cerrar();
      cargar();
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo crear el rol.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarRol = async (rol) => {
    setSelectedRol(rol);
    const permisosBase = Array.isArray(rol.permisos) ? rol.permisos : [];
    setPermisosSeleccionados(permisosBase);

    try {
      const response = await api.get(`seguridad/roles/${idRol(rol)}/permisos/`);
      const asignados = response.data?.permisos || response.data?.rol?.permisos || permisosBase;
      setPermisosSeleccionados(asignados);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron cargar permisos del rol.'), 'error');
    }
  };

  const toggleModulo = (modulo) => {
    setModulosAbiertos(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  const togglePermiso = (codigo) => {
    setPermisosSeleccionados(prev => (
      prev.includes(codigo) ? prev.filter(item => item !== codigo) : [...prev, codigo]
    ));
  };

  const togglePermisosModulo = (modulo, lista) => {
    const codigos = lista.map(item => item.codigo);
    const todos = codigos.every(codigo => permisosSeleccionados.includes(codigo));
    setPermisosSeleccionados(prev => (
      todos
        ? prev.filter(codigo => !codigos.includes(codigo))
        : [...new Set([...prev, ...codigos])]
    ));
    setModulosAbiertos(prev => ({ ...prev, [modulo]: true }));
  };

  const guardarPermisos = async () => {
    if (!selectedRol) return showToast('Selecciona un rol.', 'error');
    setLoading(true);
    try {
      const response = await api.put(`seguridad/roles/${idRol(selectedRol)}/permisos/`, {
        permisos: permisosSeleccionados,
      });
      showToast(response.data?.mensaje || 'Permisos asignados correctamente.');
      const rolActualizado = response.data?.rol;
      if (rolActualizado) {
        setRoles(prev => prev.map(rol => String(idRol(rol)) === String(idRol(rolActualizado)) ? rolActualizado : rol));
        setSelectedRol(rolActualizado);
      } else {
        cargar();
      }
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudieron asignar permisos.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="roles-layout">
        <div className="card">
          <div className="roles-header">
            <div>
              <h3 className="roles-title">Gestion de roles</h3>
              <p className="roles-subtitle">Crea roles y selecciona uno para gestionar sus permisos.</p>
            </div>
            <button className="btn-gold" onClick={abrirCrear}>+ Nuevo rol</button>
          </div>

          <div className="roles-list">
            {roles.length === 0 ? (
              <div className="roles-empty">No hay roles registrados.</div>
            ) : roles.map(rol => (
              <button
                key={idRol(rol)}
                className={`roles-list-item ${String(idRol(selectedRol)) === String(idRol(rol)) ? 'active' : ''}`}
                onClick={() => seleccionarRol(rol)}
              >
                <strong>{rol.nombre}</strong>
                <span>{(rol.permisos || []).length} permisos asignados</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card roles-permissions-card">
          <div className="roles-header">
            <div>
              <h3 className="roles-title">Gestionar permisos</h3>
              <p className="roles-subtitle">
                {selectedRol ? `Rol seleccionado: ${selectedRol.nombre}` : 'Selecciona un rol para asignar permisos.'}
              </p>
            </div>
            <button className="btn-gold" onClick={guardarPermisos} disabled={loading || !selectedRol}>
              {loading ? 'Guardando...' : 'Guardar permisos'}
            </button>
          </div>

          {!selectedRol ? (
            <div className="roles-empty">Selecciona un rol para ver sus permisos.</div>
          ) : (
            <div className="roles-permission-groups">
              {permisosPorModulo.map(({ modulo, permisos: lista }) => {
                const abierto = modulosAbiertos[modulo];
                const totalModulo = lista.filter(item => permisosSeleccionados.includes(item.codigo)).length;
                return (
                  <div className="roles-permission-group" key={modulo}>
                    <button className="roles-permission-head" onClick={() => toggleModulo(modulo)}>
                      <span>Gestionar {normalizarModulo(modulo)}</span>
                      <strong>{totalModulo}/{lista.length}</strong>
                      <em>{abierto ? '^' : 'v'}</em>
                    </button>
                    {abierto && (
                      <div className="roles-permission-items">
                        <label className="roles-permission-check roles-permission-all">
                          <input
                            type="checkbox"
                            checked={lista.every(item => permisosSeleccionados.includes(item.codigo))}
                            onChange={() => togglePermisosModulo(modulo, lista)}
                          />
                          <span>Seleccionar todos</span>
                        </label>
                        {lista.map(permiso => (
                          <label className="roles-permission-check" key={permiso.codigo}>
                            <input
                              type="checkbox"
                              checked={permisosSeleccionados.includes(permiso.codigo)}
                              onChange={() => togglePermiso(permiso.codigo)}
                            />
                            <span>{etiquetaPermiso(permiso)}</span>
                            <small>{permiso.codigo}</small>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal === 'crear' && (
        <div className="modal-overlay" onClick={cerrar}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Nuevo rol</h3>
            <p>Define el nombre del nuevo rol. Luego podras asignarle permisos.</p>
            <div className="form-group">
              <label>Nombre del rol</label>
              <input
                className="input-field"
                placeholder="Ej: Recepcionista"
                value={form.nombre}
                autoComplete="off"
                onChange={e => setForm({ nombre: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && guardarRol()}
              />
            </div>
            <div className="roles-modal-actions">
              <button className="btn-outline roles-modal-button" onClick={cerrar}>Cancelar</button>
              <button className="btn-outline roles-modal-button" onClick={() => setForm({ nombre: '' })}>Limpiar</button>
              <button className="btn-gold roles-modal-button" onClick={guardarRol} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
