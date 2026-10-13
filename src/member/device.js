// ID perangkat anonim untuk membatasi permintaan Kode Masuk per perangkat. Bukan identitas; boleh hilang.
let mem = null;
export function deviceId() {
  try {
    let v = localStorage.getItem("harumin-device");
    if (!v) { v = (crypto.randomUUID?.() ?? `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`); localStorage.setItem("harumin-device", v); }
    return v;
  } catch {
    return (mem ??= `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  }
}
