// Sayfa çizilmeden önce kayıtlı temayı uygular; yoksa sistem teması (CSS) geçerli olur.
try {
  const theme = JSON.parse(localStorage.getItem("adconv-settings"))?.theme;
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Depolama kapalı: sistem teması kalır
}
