use wasm_bindgen::prelude::*;
use std::io::Cursor;
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

/// Zip a list of files into a ZIP archive (stored, no compression).
///
/// # Arguments
/// * `paths`  – JS array of strings: relative paths inside the archive
/// * `chunks` – JS array of Uint8Arrays: file contents, same order as paths
///
/// Returns the raw bytes of the .zip file as a Uint8Array.
#[wasm_bindgen]
pub fn zip_files(
    paths: js_sys::Array,
    chunks: js_sys::Array,
) -> Result<js_sys::Uint8Array, JsValue> {
    use std::io::Write;

    let buf: Vec<u8> = Vec::new();
    let cursor = Cursor::new(buf);
    let mut writer = zip::ZipWriter::new(cursor);

    // Stored (level 0) — fastest, ideal for already-compressed files like images/video
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored);

    let len = paths.length() as usize;
    for i in 0..len {
        let path: String = paths
            .get(i as u32)
            .as_string()
            .ok_or_else(|| JsValue::from_str("expected string path"))?;

        let js_buf: js_sys::Uint8Array = chunks.get(i as u32).dyn_into()?;
        let bytes = js_buf.to_vec();

        writer
            .start_file(path, options)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        writer
            .write_all(&bytes)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
    }

    let result = writer
        .finish()
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let zip_bytes = result.into_inner();
    Ok(js_sys::Uint8Array::from(zip_bytes.as_slice()))
}
