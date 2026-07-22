import { EmptyState } from './EmptyState'

export function DataTable({
  caption,
  columns,
  emptyAction,
  emptyMessage,
  emptyTitle = 'Sin registros',
  getRowClassName,
  mobileTitle,
  rows,
}) {
  if (!rows?.length) {
    return <EmptyState action={emptyAction} description={emptyMessage} title={emptyTitle} />
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.align ? `data-table__cell--${column.align}` : undefined} key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={getRowClassName?.(row)} key={row.id}>
                {columns.map((column) => (
                  <td className={column.align ? `data-table__cell--${column.align}` : undefined} key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-list">
        {rows.map((row) => (
          <article className={['mobile-record', getRowClassName?.(row)].filter(Boolean).join(' ')} key={row.id}>
            <h2>{mobileTitle ? mobileTitle(row) : row.nombre}</h2>
            <dl>
              {columns.filter((column) => column.mobile !== false).map((column) => (
                <div key={column.key}>
                  <dt>{column.mobileLabel ?? column.header}</dt>
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
