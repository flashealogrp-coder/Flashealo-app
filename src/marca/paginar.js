// Lee todas las filas de una consulta de Supabase por páginas (PostgREST puede limitar cada respuesta a 1000 filas).
// construir(desde, hasta) debe devolver la consulta ya con .range(desde, hasta) y un orden estable.
export async function leerTodo(construir, pagina = 1000, tope = 200000) {
  const filas = [];
  for (let desde = 0; desde < tope; desde += pagina) {
    const { data, error } = await construir(desde, desde + pagina - 1);
    if (error) throw error;
    if (!data) break;
    filas.push(...data);
    if (data.length < pagina) break;
  }
  return filas;
}
