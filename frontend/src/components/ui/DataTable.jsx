import { EmptyState } from './EmptyState'

export function DataTable({ caption, columns, emptyMessage, mobileTitle, rows }) {
  if (!rows?.length) {
    return <EmptyState description={emptyMessage} title="Sin registros" />
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-list">
        {rows.map((row) => (
          <article className="mobile-record" key={row.id}>
            <h2>{mobileTitle ? mobileTitle(row) : row.nombre}</h2>
            <dl>
              {columns.map((column) => (
                <div key={column.key}>
                  <dt>{column.header}</dt>
                  <dd>{column.render ? column.render(row) : row[column.key]}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  )
}
