const normalizeDateForPostgres = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const dayMonthYearMatch = rawValue.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch;
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

module.exports = {
  normalizeDateForPostgres,
};
