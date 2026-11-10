export type Rol = 'cliente' | 'chofer' | 'tienda' | 'moderador' | 'super_admin';

export type CategoriaTienda = 'Bodegas' | 'Ferreterías' | 'Carnicerías' | 'Farmacias';

export interface Usuario {
  uid: string;
  nombre: string;
  celular: string;
  rol: Rol;
  caserio: string;
  strikes: number;
  viajes_completados: number;
  calificacion_promedio: number;
  fecha_fin_prueba: string | null;
  ventas_mural_mes: number;
}
