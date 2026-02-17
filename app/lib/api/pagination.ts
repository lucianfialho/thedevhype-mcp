export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));
  const offset = (page - 1) * perPage;
  return { page, perPage, offset };
}

export function paginationMeta(page: number, perPage: number, total: number) {
  return {
    page,
    per_page: perPage,
    total,
    total_pages: Math.ceil(total / perPage),
  };
}
