export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SKIP_BOOTSTRAP !== "1") {
    const { bootstrap } = await import("./lib/bootstrap");
    try {
      await bootstrap();
    } catch (err) {
      console.error("[bootstrap] gagal:", err);
      throw err;
    }
  }
}
