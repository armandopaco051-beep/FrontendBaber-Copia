import { useEffect, useMemo, useState } from 'react';

import api from '../../api/axiosConfig';
import { diagnosticarReporteVoz, interpretarReportePorTexto } from '../../api/reportesVozApi';
import GrabadorVozReporte from '../../components/GrabadorVozReporte';
import { formatApiError } from '../../utils/apiError';

const FORMATOS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
];

const REPORTES = [
  {
    id: 'ventas',
    nombre: 'Ventas',
    endpoint: 'reportes/ventas/',
    descripcion: 'Ventas por estado, cliente, cajero, producto, servicio, barbero y metodo de pago.',
    filtros: ['fecha_inicio', 'fecha_fin', 'estado_venta', 'cliente', 'cajero', 'metodo_pago', 'tipo_item', 'servicio', 'producto', 'barbero'],
    columnas: ['Venta', 'Fecha', 'Cliente', 'Cajero', 'Estado', 'Metodo pago', 'Subtotal', 'Descuento', 'Total'],
    utilidad: 'Permite revisar ventas pagadas, anuladas o borradores y analizar ingresos por cliente, cajero, item o metodo de pago.',
  },
  {
    id: 'productos-vendidos',
    nombre: 'Productos vendidos',
    endpoint: 'reportes/productos-vendidos/',
    descripcion: 'Cantidad e importe generado por productos vendidos.',
    filtros: ['fecha_inicio', 'fecha_fin', 'producto', 'categoria_producto', 'marca', 'cliente', 'cajero', 'metodo_pago', 'estado_venta_pagada'],
    columnas: ['Producto', 'Categoria', 'Marca', 'Cantidad vendida', 'Precio unitario', 'Descuento', 'Subtotal', 'Stock actual'],
    utilidad: 'Muestra que productos se vendieron, cuanto generaron y como queda el stock disponible.',
  },
  {
    id: 'servicios-realizados',
    nombre: 'Servicios realizados',
    endpoint: 'reportes/servicios-realizados/',
    descripcion: 'Servicios atendidos por barbero, cliente, categoria y metodo de pago.',
    filtros: ['fecha_inicio', 'fecha_fin', 'servicio', 'categoria_servicio', 'barbero', 'cliente', 'cajero', 'metodo_pago', 'promocion_aplicada', 'estado_venta_pagada'],
    columnas: ['Servicio', 'Categoria', 'Barbero', 'Cliente', 'Cantidad', 'Precio unitario', 'Descuento', 'Subtotal', 'Venta', 'Fecha'],
    utilidad: 'Sirve para medir demanda de servicios, productividad de barberos y servicios con descuentos aplicados.',
  },
  {
    id: 'caja-movimientos',
    nombre: 'Caja y movimientos',
    endpoint: 'reportes/caja-movimientos/',
    descripcion: 'Aperturas, cierres, diferencias y movimientos de caja.',
    filtros: ['fecha_inicio', 'fecha_fin', 'estado_caja', 'responsable', 'con_diferencia', 'tipo_movimiento', 'estado_movimiento', 'metodo_pago'],
    columnas: ['Caja', 'Tipo movimiento', 'Metodo pago', 'Monto', 'Descripcion', 'Referencia', 'Usuario', 'Fecha', 'Estado', 'Diferencia'],
    utilidad: 'Ayuda a auditar aperturas, cierres, ingresos, egresos, retiros, ajustes y diferencias de caja.',
  },
  {
    id: 'inventario',
    nombre: 'Inventario',
    endpoint: 'reportes/inventario/',
    descripcion: 'Productos, categorias, marcas, stock bajo y disponibilidad.',
    filtros: ['producto', 'categoria_producto', 'marca', 'tipo_producto', 'estado_producto', 'stock_bajo', 'sin_stock'],
    columnas: ['Producto', 'Categoria', 'Marca', 'Tipo producto', 'Precio venta', 'Cantidad disponible', 'Stock minimo', 'Estado', 'Stock bajo'],
    utilidad: 'Permite controlar productos activos, productos sin stock y productos que necesitan reposicion.',
  },
  {
    id: 'comisiones',
    nombre: 'Comisiones',
    endpoint: 'reportes/comisiones/',
    descripcion: 'Comisiones generadas por barbero, servicio y venta pagada.',
    filtros: ['fecha_inicio', 'fecha_fin', 'barbero', 'servicio', 'estado_venta_pagada'],
    columnas: ['Barbero', 'Servicio', 'Venta', 'Subtotal servicio', 'Porcentaje', 'Monto comision', 'Fecha'],
    utilidad: 'Resume cuanto corresponde pagar por comisiones generadas en ventas pagadas.',
  },
  {
    id: 'servicios-promocion',
    nombre: 'Servicios con promocion',
    endpoint: 'reportes/servicios-promocion/',
    descripcion: 'Uso de promociones, descuentos aplicados y servicios relacionados.',
    filtros: ['fecha_inicio', 'fecha_fin', 'promocion', 'servicio', 'categoria_servicio', 'barbero', 'cliente', 'estado_promocion', 'tipo_descuento'],
    columnas: ['Promocion', 'Servicio', 'Categoria', 'Cliente', 'Barbero', 'Precio original', 'Descuento aplicado', 'Total cobrado', 'Fecha venta'],
    utilidad: 'Mide que promociones se usaron, en que servicios y cuanto descuento se aplico.',
  },
];

const EMPTY_FILTROS = {
  fecha_inicio: '',
  fecha_fin: '',
  estado: '',
  estado_venta: '',
  estado_caja: '',
  estado_movimiento: '',
  estado_producto: '',
  estado_promocion: '',
  cliente: '',
  cajero: '',
  barbero: '',
  responsable: '',
  id_metodo_pago: '',
  tipo_item: '',
  id_servicio: '',
  id_producto: '',
  id_categoria_servicio: '',
  id_categoria_producto: '',
  id_marca: '',
  tipo_producto: '',
  tipo_movimiento: '',
  id_promocion: '',
  promocion_aplicada: '',
  con_diferencia: '',
  stock_bajo: '',
  sin_stock: '',
  tipo_descuento: '',
};

const CAMPOS_BOOLEANOS = new Set(['promocion_aplicada', 'con_diferencia', 'stock_bajo', 'sin_stock']);

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

function idGenerico(item, key) {
  return item?.[key] || item?.id || '';
}

function nombrePersona(persona) {
  return [persona?.nombre, persona?.apellido].filter(Boolean).join(' ') || persona?.nombre || '';
}

function limpiarParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

function descargarBlob(data, nombreArchivo) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function obtenerReportePorId(id) {
  return REPORTES.find(reporte => reporte.id === id) || REPORTES[0];
}

function construirParamsReporte(reporte, formato, filtros) {
  const params = {
    formato,
    fecha_inicio: filtros.fecha_inicio,
    fecha_fin: filtros.fecha_fin,
    estado: filtros.estado,
    estado_venta: filtros.estado_venta,
    estado_caja: filtros.estado_caja,
    estado_movimiento: filtros.estado_movimiento,
    estado_producto: filtros.estado_producto,
    estado_promocion: filtros.estado_promocion,
    cliente: filtros.cliente,
    cajero: filtros.cajero,
    barbero: filtros.barbero,
    responsable: filtros.responsable,
    id_metodo_pago: filtros.id_metodo_pago,
    tipo_item: filtros.tipo_item,
    id_servicio: filtros.id_servicio,
    id_producto: filtros.id_producto,
    id_categoria_servicio: filtros.id_categoria_servicio,
    id_categoria_producto: filtros.id_categoria_producto,
    id_marca: filtros.id_marca,
    tipo_producto: filtros.tipo_producto,
    tipo_movimiento: filtros.tipo_movimiento,
    id_promocion: filtros.id_promocion,
    promocion_aplicada: filtros.promocion_aplicada,
    con_diferencia: filtros.con_diferencia,
    stock_bajo: filtros.stock_bajo,
    sin_stock: filtros.sin_stock,
    tipo_descuento: filtros.tipo_descuento,
  };

  if (reporte.filtros.includes('estado_venta_pagada')) params.estado_venta = 'PAGADA';
  return limpiarParams(params);
}

function normalizarFiltrosVozParaEstado(filtrosDetectados = {}) {
  const filtros = { ...EMPTY_FILTROS };

  Object.entries(filtrosDetectados).forEach(([key, value]) => {
    if (!(key in filtros)) return;
    if (CAMPOS_BOOLEANOS.has(key)) {
      filtros[key] = value ? 'true' : 'false';
      return;
    }
    filtros[key] = value === null || value === undefined ? '' : String(value);
  });

  return filtros;
}

function formatearValorFiltro(valor) {
  if (valor === true) return 'Si';
  if (valor === false) return 'No';
  return String(valor);
}

export default function Reportes() {
  const [tipoReporte, setTipoReporte] = useState('ventas');
  const [formato, setFormato] = useState('pdf');
  const [filtros, setFiltros] = useState({ ...EMPTY_FILTROS });
  const [catalogos, setCatalogos] = useState({
    clientes: [],
    barberos: [],
    servicios: [],
    categoriasServicio: [],
    productos: [],
    categoriasProducto: [],
    marcas: [],
    metodosPago: [],
    promociones: [],
  });
  const [preview, setPreview] = useState({ columnas: [], filas: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [resultadoComando, setResultadoComando] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [diagnosticoLoading, setDiagnosticoLoading] = useState(false);
  const [textoConsulta, setTextoConsulta] = useState('');
  const [textoLoading, setTextoLoading] = useState(false);

  const reporteActual = obtenerReportePorId(tipoReporte);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const cargarCatalogos = async () => {
    const [
      clientesRes,
      barberosRes,
      serviciosRes,
      categoriasServicioRes,
      productosRes,
      categoriasProductoRes,
      marcasRes,
      metodosRes,
      promocionesRes,
    ] = await Promise.allSettled([
      api.get('seguridad/usuarios/'),
      api.get('seguridad/barberos/'),
      api.get('servicios/servicios/'),
      api.get('servicios/categorias/'),
      api.get('inventario/productos/'),
      api.get('inventario/categorias/'),
      api.get('inventario/marcas/'),
      api.get('ventas-caja/metodos-pago/'),
      api.get('citas/promociones/'),
    ]);

    setCatalogos({
      clientes: clientesRes.status === 'fulfilled'
        ? normalizarLista(clientesRes.value.data).filter(u => u.rol === 'Cliente' || u.rol?.toLowerCase() === 'cliente')
        : [],
      barberos: barberosRes.status === 'fulfilled' ? normalizarLista(barberosRes.value.data, 'barberos') : [],
      servicios: serviciosRes.status === 'fulfilled' ? normalizarLista(serviciosRes.value.data, 'servicios') : [],
      categoriasServicio: categoriasServicioRes.status === 'fulfilled' ? normalizarLista(categoriasServicioRes.value.data, 'categorias') : [],
      productos: productosRes.status === 'fulfilled' ? normalizarLista(productosRes.value.data, 'productos') : [],
      categoriasProducto: categoriasProductoRes.status === 'fulfilled' ? normalizarLista(categoriasProductoRes.value.data, 'categorias') : [],
      marcas: marcasRes.status === 'fulfilled' ? normalizarLista(marcasRes.value.data, 'marcas') : [],
      metodosPago: metodosRes.status === 'fulfilled' ? normalizarLista(metodosRes.value.data, 'metodos_pago') : [],
      promociones: promocionesRes.status === 'fulfilled' ? normalizarLista(promocionesRes.value.data, 'promociones') : [],
    });
  };

  useEffect(() => { cargarCatalogos(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const cambiarReporte = (id) => {
    setTipoReporte(id);
    setFiltros({ ...EMPTY_FILTROS });
    setPreview({ columnas: [], filas: [] });
  };

  const setFiltro = (key, value) => {
    setFiltros(actual => ({ ...actual, [key]: value }));
  };

  const paramsReporte = useMemo(
    () => construirParamsReporte(reporteActual, formato, filtros),
    [filtros, formato, reporteActual],
  );

  const generarReporte = async (opciones = {}) => {
    const reporte = obtenerReportePorId(opciones.tipoReporte || tipoReporte);
    const formatoSeleccionado = opciones.formato || formato;
    const filtrosSeleccionados = opciones.filtros || filtros;

    if (!formatoSeleccionado) {
      showToast('Selecciona PDF o Excel.', 'error');
      return false;
    }

    setLoading(true);
    try {
      const response = await api.get(reporte.endpoint, {
        params: construirParamsReporte(reporte, formatoSeleccionado, filtrosSeleccionados),
        responseType: 'blob',
      });
      const extension = formatoSeleccionado === 'excel' ? 'xlsx' : 'pdf';
      descargarBlob(response.data, `${reporte.id}-${new Date().toISOString().slice(0, 10)}.${extension}`);
      showToast(`Reporte ${reporte.nombre} generado correctamente.`);
      return true;
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo generar el reporte. Verifica que el endpoint exista en backend.'), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cargarVistaPrevia = async (opciones = {}) => {
    const reporte = obtenerReportePorId(opciones.tipoReporte || tipoReporte);
    const formatoSeleccionado = opciones.formato || formato;
    const filtrosSeleccionados = opciones.filtros || filtros;

    setPreviewLoading(true);
    try {
      const endpoint = reporte.endpoint.replace(/\/$/, '/preview/');
      const params = { ...construirParamsReporte(reporte, formatoSeleccionado, filtrosSeleccionados) };
      delete params.formato;
      const response = await api.get(endpoint, { params });
      const columnas = response.data?.columnas || response.data?.columns || reporte.columnas;
      const filas = response.data?.filas || response.data?.rows || response.data?.datos || response.data?.results || [];
      setPreview({ columnas, filas });
      showToast('Vista previa cargada correctamente.');
      return true;
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo cargar la vista previa. El backend debe exponer /preview/ para este reporte.'), 'error');
      return false;
    } finally {
      setPreviewLoading(false);
    }
  };

  const aplicarResultadoInterpretado = async (resultado) => {
    setResultadoComando(resultado);

    if (resultado.accion === 'needs_clarification' || !resultado.tipo_reporte) {
      showToast(resultado.mensaje, 'error');
      return;
    }

    const filtrosDetectados = normalizarFiltrosVozParaEstado(resultado.filtros_detectados);
    const formatoDetectado = resultado.formato || formato;

    setTipoReporte(resultado.tipo_reporte);
    setFormato(formatoDetectado);
    setFiltros(filtrosDetectados);
    setPreview({ columnas: [], filas: [] });

    if (resultado.accion === 'download') {
      await generarReporte({
        tipoReporte: resultado.tipo_reporte,
        formato: formatoDetectado,
        filtros: filtrosDetectados,
      });
      return;
    }

    await cargarVistaPrevia({
      tipoReporte: resultado.tipo_reporte,
      formato: formatoDetectado,
      filtros: filtrosDetectados,
    });
  };

  const ejecutarDiagnostico = async () => {
    setDiagnosticoLoading(true);
    try {
      const response = await diagnosticarReporteVoz();
      setDiagnostico(response.data);
      showToast('Diagnóstico de voz obtenido correctamente.');
    } catch (error) {
      setDiagnostico(null);
      showToast(
        `El frontend no está llegando al backend local. Revise Vite proxy o sesión. ${formatApiError(error.response?.data, '')}`.trim(),
        'error',
      );
    } finally {
      setDiagnosticoLoading(false);
    }
  };

  const ejecutarTexto = async () => {
    const consulta = textoConsulta.trim();
    if (!consulta) {
      showToast('Ingresa un comando para probar la interpretación por texto.', 'error');
      return;
    }

    setTextoLoading(true);
    try {
      const response = await interpretarReportePorTexto(consulta);
      await aplicarResultadoInterpretado(response.data);
    } catch (error) {
      showToast(formatApiError(error.response?.data, 'No se pudo interpretar el comando por texto.'), 'error');
    } finally {
      setTextoLoading(false);
    }
  };

  const valorCelda = (fila, columna) => {
    if (Array.isArray(fila)) return fila[preview.columnas.indexOf(columna)] ?? '-';
    const key = String(columna)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return fila?.[key] ?? fila?.[columna] ?? '-';
  };

  const renderFiltro = (filtro) => {
    if (filtro === 'fecha_inicio') {
      return <Campo key={filtro} label="Fecha inicio"><input className="input-field" type="date" value={filtros.fecha_inicio} onChange={e => setFiltro('fecha_inicio', e.target.value)} /></Campo>;
    }
    if (filtro === 'fecha_fin') {
      return <Campo key={filtro} label="Fecha fin"><input className="input-field" type="date" value={filtros.fecha_fin} onChange={e => setFiltro('fecha_fin', e.target.value)} /></Campo>;
    }
    if (filtro === 'estado_venta') {
      return (
        <Campo key={filtro} label="Estado venta">
          <select className="input-field" value={filtros.estado_venta} onChange={e => setFiltro('estado_venta', e.target.value)}>
            <option value="">Todas</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PENDIENTE_PAGO">Pendiente de pago</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'estado_venta_pagada') {
      return <Campo key={filtro} label="Estado venta"><input className="input-field" value="PAGADA" disabled /></Campo>;
    }
    if (filtro === 'estado_caja') {
      return (
        <Campo key={filtro} label="Estado caja">
          <select className="input-field" value={filtros.estado_caja} onChange={e => setFiltro('estado_caja', e.target.value)}>
            <option value="">Todas</option>
            <option value="ABIERTA">Abierta</option>
            <option value="CERRADA">Cerrada</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'estado_movimiento') {
      return (
        <Campo key={filtro} label="Estado movimiento">
          <select className="input-field" value={filtros.estado_movimiento} onChange={e => setFiltro('estado_movimiento', e.target.value)}>
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'estado_producto' || filtro === 'estado_promocion') {
      return (
        <Campo key={filtro} label={filtro === 'estado_producto' ? 'Estado producto' : 'Estado promocion'}>
          <select className="input-field" value={filtros[filtro]} onChange={e => setFiltro(filtro, e.target.value)}>
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'cliente' || filtro === 'cajero' || filtro === 'responsable') {
      const labels = { cliente: 'Cliente', cajero: 'Cajero', responsable: 'Responsable' };
      return <Campo key={filtro} label={labels[filtro]}><input className="input-field" value={filtros[filtro]} onChange={e => setFiltro(filtro, e.target.value)} placeholder="Nombre o codigo" /></Campo>;
    }
    if (filtro === 'barbero') {
      return (
        <Campo key={filtro} label="Barbero">
          <select className="input-field" value={filtros.barbero} onChange={e => setFiltro('barbero', e.target.value)}>
            <option value="">Todos</option>
            {catalogos.barberos.map(barbero => <option key={barbero.codigo} value={barbero.codigo}>{barbero.codigo} - {nombrePersona(barbero)}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'metodo_pago') {
      return (
        <Campo key={filtro} label="Metodo de pago">
          <select className="input-field" value={filtros.id_metodo_pago} onChange={e => setFiltro('id_metodo_pago', e.target.value)}>
            <option value="">Todos</option>
            {catalogos.metodosPago.map(metodo => <option key={idGenerico(metodo, 'id_metodo_pago')} value={idGenerico(metodo, 'id_metodo_pago')}>{metodo.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'tipo_item') {
      return (
        <Campo key={filtro} label="Tipo item">
          <select className="input-field" value={filtros.tipo_item} onChange={e => setFiltro('tipo_item', e.target.value)}>
            <option value="">Todos</option>
            <option value="SERVICIO">Servicio</option>
            <option value="PRODUCTO">Producto</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'servicio') {
      return (
        <Campo key={filtro} label="Servicio">
          <select className="input-field" value={filtros.id_servicio} onChange={e => setFiltro('id_servicio', e.target.value)}>
            <option value="">Todos</option>
            {catalogos.servicios.map(servicio => <option key={idGenerico(servicio, 'id_servicio')} value={idGenerico(servicio, 'id_servicio')}>{servicio.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'producto') {
      return (
        <Campo key={filtro} label="Producto">
          <select className="input-field" value={filtros.id_producto} onChange={e => setFiltro('id_producto', e.target.value)}>
            <option value="">Todos</option>
            {catalogos.productos.map(producto => <option key={idGenerico(producto, 'id_producto')} value={idGenerico(producto, 'id_producto')}>{producto.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'categoria_servicio' || filtro === 'categoria_producto') {
      const esServicio = filtro === 'categoria_servicio';
      const key = esServicio ? 'id_categoria_servicio' : 'id_categoria_producto';
      const lista = esServicio ? catalogos.categoriasServicio : catalogos.categoriasProducto;
      return (
        <Campo key={filtro} label={esServicio ? 'Categoria servicio' : 'Categoria producto'}>
          <select className="input-field" value={filtros[key]} onChange={e => setFiltro(key, e.target.value)}>
            <option value="">Todas</option>
            {lista.map(categoria => <option key={idGenerico(categoria, 'id_categoria')} value={idGenerico(categoria, 'id_categoria')}>{categoria.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'marca') {
      return (
        <Campo key={filtro} label="Marca">
          <select className="input-field" value={filtros.id_marca} onChange={e => setFiltro('id_marca', e.target.value)}>
            <option value="">Todas</option>
            {catalogos.marcas.map(marca => <option key={idGenerico(marca, 'id_marca')} value={idGenerico(marca, 'id_marca')}>{marca.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (filtro === 'tipo_producto') {
      return (
        <Campo key={filtro} label="Tipo producto">
          <select className="input-field" value={filtros.tipo_producto} onChange={e => setFiltro('tipo_producto', e.target.value)}>
            <option value="">Todos</option>
            <option value="VENTA">Venta</option>
            <option value="USO_INTERNO">Uso interno</option>
            <option value="AMBOS">Ambos</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'tipo_movimiento') {
      return (
        <Campo key={filtro} label="Tipo movimiento">
          <select className="input-field" value={filtros.tipo_movimiento} onChange={e => setFiltro('tipo_movimiento', e.target.value)}>
            <option value="">Todos</option>
            <option value="INGRESO_MANUAL">Ingreso manual</option>
            <option value="EGRESO">Egreso</option>
            <option value="RETIRO">Retiro</option>
            <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
            <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
            <option value="VENTA">Venta</option>
            <option value="DEVOLUCION">Devolucion</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'promocion') {
      return (
        <Campo key={filtro} label="Promocion">
          <select className="input-field" value={filtros.id_promocion} onChange={e => setFiltro('id_promocion', e.target.value)}>
            <option value="">Todas</option>
            {catalogos.promociones.map(promocion => <option key={idGenerico(promocion, 'id_promocion')} value={idGenerico(promocion, 'id_promocion')}>{promocion.nombre}</option>)}
          </select>
        </Campo>
      );
    }
    if (['promocion_aplicada', 'con_diferencia', 'stock_bajo', 'sin_stock'].includes(filtro)) {
      const labels = {
        promocion_aplicada: 'Promocion aplicada',
        con_diferencia: 'Con diferencia',
        stock_bajo: 'Stock bajo',
        sin_stock: 'Sin stock',
      };
      return (
        <Campo key={filtro} label={labels[filtro]}>
          <select className="input-field" value={filtros[filtro]} onChange={e => setFiltro(filtro, e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Si</option>
            <option value="false">No</option>
          </select>
        </Campo>
      );
    }
    if (filtro === 'tipo_descuento') {
      return (
        <Campo key={filtro} label="Tipo descuento">
          <select className="input-field" value={filtros.tipo_descuento} onChange={e => setFiltro('tipo_descuento', e.target.value)}>
            <option value="">Todos</option>
            <option value="PORCENTAJE">Porcentaje</option>
            <option value="MONTO">Monto</option>
          </select>
        </Campo>
      );
    }

    return null;
  };

  return (
    <div>
      <div className="ventas-caja-stats reportes-dashboard-stats">
        <div className="stat-card">
          <div className="label">Reportes</div>
          <div className="value">{REPORTES.length}</div>
          <div className="sub">Disponibles para generar</div>
        </div>
        <div className="stat-card">
          <div className="label">Formato</div>
          <div className="value gold">{formato.toUpperCase()}</div>
          <div className="sub">PDF o Excel</div>
        </div>
        <div className="stat-card">
          <div className="label">Seleccionado</div>
          <div className="value">{reporteActual.nombre}</div>
          <div className="sub">Con filtros dinamicos</div>
        </div>
      </div>

      <div className="card reportes-main-card">
        <div className="ventas-caja-header">
          <div>
            <h3 className="ventas-caja-title">Generar reportes</h3>
            <p className="ventas-caja-subtitle">Selecciona el reporte, aplica filtros y descarga el archivo en PDF o Excel.</p>
          </div>
          <button className="btn-gold" onClick={generarReporte} disabled={loading}>{loading ? 'Generando...' : 'Generar reporte'}</button>
        </div>

        <div className="reportes-voz-card">
          <div className="reportes-panel-head">
            <div>
              <h4>Consulta por voz</h4>
              <p>Todo el flujo usa el mismo origen `/api` del frontend y Vite lo proxya al backend local para probarlo con un solo túnel ngrok.</p>
            </div>
            <button className="btn-outline" type="button" onClick={ejecutarDiagnostico} disabled={diagnosticoLoading}>
              {diagnosticoLoading ? 'Probando backend...' : 'Diagnóstico de voz'}
            </button>
          </div>

          <GrabadorVozReporte onResultado={aplicarResultadoInterpretado} />

          <div className="reportes-voz-text-card">
            <Campo label="Probar comando por texto">
              <input
                className="input-field"
                value={textoConsulta}
                onChange={e => setTextoConsulta(e.target.value)}
                placeholder="Mostrar ventas de hoy"
              />
            </Campo>
            <button className="btn-outline" type="button" onClick={ejecutarTexto} disabled={textoLoading}>
              {textoLoading ? 'Interpretando...' : 'Interpretar comando'}
            </button>
          </div>

          {diagnostico ? (
            <div className="reportes-voz-diagnostic">
              <div className="reportes-voz-grid">
                <div>
                  <span>Backend</span>
                  <strong>{diagnostico.backend}</strong>
                </div>
                <div>
                  <span>Módulo</span>
                  <strong>{diagnostico.modulo}</strong>
                </div>
                <div>
                  <span>Groq configurado</span>
                  <strong>{diagnostico.groq_configurado ? 'true' : 'false'}</strong>
                </div>
                <div>
                  <span>Modelo</span>
                  <strong>{diagnostico.modelo}</strong>
                </div>
              </div>
              <div className="reportes-voz-summary">
                <span>Backend alcanzado: {diagnostico.backend}. Base URL Groq: {diagnostico.groq_base_url}</span>
              </div>
            </div>
          ) : null}

          {resultadoComando ? (
            <div className="reportes-voz-result">
              <div className="reportes-voz-grid">
                <div>
                  <span>Modo</span>
                  <strong>{resultadoComando.modo || '-'}</strong>
                </div>
                <div>
                  <span>Acción</span>
                  <strong>{resultadoComando.accion || '-'}</strong>
                </div>
                <div>
                  <span>Reporte</span>
                  <strong>{resultadoComando.tipo_reporte ? obtenerReportePorId(resultadoComando.tipo_reporte).nombre : 'Sin coincidencia'}</strong>
                </div>
                <div>
                  <span>Formato</span>
                  <strong>{resultadoComando.formato ? resultadoComando.formato.toUpperCase() : 'Sin formato'}</strong>
                </div>
              </div>

              <div className="reportes-voz-summary">
                <span>{resultadoComando.mensaje}</span>
              </div>

              <div className="reportes-voz-filters">
                <h4>Resultado interpretado</h4>
                <div className="reportes-voz-transcription">
                  <strong>Transcripción:</strong> {resultadoComando.transcripcion || '-'}
                </div>
                {Object.keys(resultadoComando.filtros_detectados || {}).length === 0 ? (
                  <div className="ventas-caja-empty">No se detectaron filtros adicionales.</div>
                ) : (
                  <div className="reportes-columns-grid">
                    {Object.entries(resultadoComando.filtros_detectados || {}).map(([key, value]) => (
                      <span key={key}>{key}: {formatearValorFiltro(value)}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="reportes-layout">
          <div className="reportes-list">
            {REPORTES.map(reporte => (
              <button
                key={reporte.id}
                className={`reportes-list-item ${tipoReporte === reporte.id ? 'active' : ''}`}
                onClick={() => cambiarReporte(reporte.id)}
              >
                <strong>{reporte.nombre}</strong>
                <span>{reporte.descripcion}</span>
              </button>
            ))}
          </div>

          <div className="reportes-panel">
            <div className="reportes-panel-head">
              <div>
                <h4>{reporteActual.nombre}</h4>
                <p>{reporteActual.descripcion}</p>
              </div>
              <div className="reportes-format-toggle">
                {FORMATOS.map(item => (
                  <button key={item.value} className={formato === item.value ? 'active' : ''} onClick={() => setFormato(item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="reportes-filter-grid">
              {reporteActual.filtros.map(renderFiltro)}
            </div>

            <div className="reportes-preview-card">
              <div>
                <h4>Vista previa del reporte</h4>
                <p>{reporteActual.utilidad}</p>
              </div>
              <div className="reportes-columns-grid">
                {reporteActual.columnas.map(columna => (
                  <span key={columna}>{columna}</span>
                ))}
              </div>
              <div className="reportes-preview-actions">
                <button className="btn-outline" onClick={cargarVistaPrevia} disabled={previewLoading}>
                  {previewLoading ? 'Cargando datos...' : 'Ver datos'}
                </button>
                <span>Usa los filtros actuales y muestra la información antes de generar PDF o Excel.</span>
              </div>
            </div>

            <div className="reportes-data-preview">
              <div className="reportes-data-head">
                <h4>Datos del reporte</h4>
                <span>{preview.filas.length} registros</span>
              </div>
              {preview.filas.length === 0 ? (
                <div className="ventas-caja-empty">Carga la vista previa para visualizar los datos de la base.</div>
              ) : (
                <div className="reportes-table-wrap">
                  <table className="tabla">
                    <thead>
                      <tr>
                        {preview.columnas.map(columna => <th key={columna}>{columna}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.filas.map((fila, index) => (
                        <tr key={fila.id || fila.id_venta || fila.id_caja || fila.id_movimiento_caja || index}>
                          {preview.columnas.map(columna => <td key={columna}>{valorCelda(fila, columna)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="reportes-preview">
              <h4>Parámetros que se enviarán al backend</h4>
              <pre>{JSON.stringify(paramsReporte, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}
