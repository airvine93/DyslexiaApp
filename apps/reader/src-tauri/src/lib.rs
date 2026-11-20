//! The native side of Easy Reader. The reading page itself is web code shared with the browser version; this adds what a
//! web page cannot do: tint the whole screen over other apps, and a keyboard shortcut that reads whatever you copied.

use serde::Serialize;
use std::sync::Mutex;
#[cfg(desktop)]
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Text that arrived before the reading page was ready to receive it.
#[derive(Default)]
struct Pending(Mutex<Option<String>>);

#[derive(Serialize)]
struct Capabilities {
    screen_tint: bool,
    note: String,
}

#[derive(Clone, Serialize)]
struct Tint {
    colour: String,
    alpha: f64,
}

#[tauri::command]
fn capabilities() -> Capabilities {
    #[cfg(desktop)]
    {
        let shortcut = if cfg!(target_os = "macos") { "Cmd+Option+R" } else { "Ctrl+Alt+R" };
        let mut note = format!(
            "Clicks and typing go straight through the tint. Tip: copy text in any app, then press {shortcut} to read it here."
        );
        if cfg!(target_os = "linux") {
            note.push_str(" On some Linux desktops using Wayland the tint may not cover other apps; it works on X11.");
        }
        Capabilities { screen_tint: true, note }
    }
    #[cfg(mobile)]
    {
        Capabilities {
            screen_tint: false,
            note: if cfg!(target_os = "ios") {
                "To tint everything on an iPhone or iPad, use Settings > Accessibility > Display & Text Size > Colour Filters > Colour Tint.".into()
            } else {
                "Tinting the whole screen on Android is coming in the next version.".into()
            },
        }
    }
}

#[tauri::command]
fn take_pending_text(state: tauri::State<'_, Pending>) -> Option<String> {
    state.0.lock().ok().and_then(|mut p| p.take())
}

/// Show, recolour or remove the see-through, click-through windows that tint each monitor.
#[tauri::command]
#[allow(unused_variables)]
fn set_screen_tint(app: tauri::AppHandle, on: bool, colour: String, alpha: f64) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let colour = if colour.len() == 7 && colour.starts_with('#') && colour[1..].chars().all(|c| c.is_ascii_hexdigit()) {
            colour
        } else {
            "#fff3b0".to_string()
        };
        let alpha = alpha.clamp(0.0, 0.7);
        let monitors = if on { app.available_monitors().map_err(|e| e.to_string())? } else { Vec::new() };
        // Remove tint windows that are no longer wanted (tint off, or a monitor was unplugged)
        for (label, window) in app.webview_windows() {
            if let Some(i) = label.strip_prefix("tint-").and_then(|n| n.parse::<usize>().ok()) {
                if i >= monitors.len() {
                    let _ = window.close();
                }
            }
        }
        for (i, monitor) in monitors.iter().enumerate() {
            let label = format!("tint-{i}");
            let payload = Tint { colour: colour.clone(), alpha };
            if app.get_webview_window(&label).is_some() {
                app.emit_to(label.as_str(), "tint", payload).map_err(|e| e.to_string())?;
                continue;
            }
            let scale = monitor.scale_factor();
            let pos = monitor.position();
            let size = monitor.size();
            let url = format!("overlay.html?c={}&a={alpha}", &colour[1..]);
            let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
                .title("Screen tint")
                .transparent(true)
                .decorations(false)
                .shadow(false)
                .always_on_top(true)
                .visible_on_all_workspaces(true)
                .skip_taskbar(true)
                .resizable(false)
                .focused(false)
                .position(pos.x as f64 / scale, pos.y as f64 / scale)
                .inner_size(size.width as f64 / scale, size.height as f64 / scale)
                .build()
                .map_err(|e| e.to_string())?;
            window.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(desktop)]
fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Copy text anywhere, press the shortcut, and it opens in the reader.
#[cfg(desktop)]
fn read_clipboard(app: &tauri::AppHandle) {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let text = app.clipboard().read_text().unwrap_or_default();
    show_main(app);
    if !text.trim().is_empty() {
        if let Ok(mut p) = app.state::<Pending>().0.lock() {
            *p = Some(text.clone());
        }
        let _ = app.emit_to("main", "read-text", text);
    }
}

#[cfg(desktop)]
fn setup_desktop(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

    let mods = if cfg!(target_os = "macos") { Modifiers::SUPER | Modifiers::ALT } else { Modifiers::CONTROL | Modifiers::ALT };
    let read = Shortcut::new(Some(mods), Code::KeyR);
    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, shortcut, event| {
                if shortcut == &read && event.state() == ShortcutState::Pressed {
                    read_clipboard(app);
                }
            })
            .build(),
    )?;
    // Another app may already own the shortcut; the reader still works without it
    if let Err(e) = app.global_shortcut().register(read) {
        eprintln!("Could not register the read shortcut: {e}");
    }

    let open = MenuItem::with_id(app, "open", "Open Easy Reader", true, None::<&str>)?;
    let clip = MenuItem::with_id(app, "clip", "Read what I copied", true, None::<&str>)?;
    let tint_off = MenuItem::with_id(app, "tint-off", "Turn screen tint off", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &clip, &tint_off, &quit])?;
    let mut tray = TrayIconBuilder::new().tooltip("Easy Reader").menu(&menu).on_menu_event(|app, event| match event.id.as_ref() {
        "open" => show_main(app),
        "clip" => read_clipboard(app),
        "tint-off" => {
            let _ = set_screen_tint(app.clone(), false, String::new(), 0.0);
            let _ = app.emit_to("main", "screen-tint-off", ());
        }
        "quit" => app.exit(0),
        _ => {}
    });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().manage(Pending::default());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_clipboard_manager::init());
    }
    builder
        .setup(|_app| {
            #[cfg(desktop)]
            setup_desktop(_app)?;
            Ok(())
        })
        .on_window_event(|_window, _event| {
            // Closing the reader while the screen is tinted keeps the tint going; the tray icon brings the reader back
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = _event {
                let app = _window.app_handle();
                let tinting = app.webview_windows().keys().any(|l| l.starts_with("tint-"));
                if _window.label() == "main" && tinting {
                    api.prevent_close();
                    let _ = _window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![capabilities, set_screen_tint, take_pending_text])
        .run(tauri::generate_context!())
        .expect("error while running Easy Reader");
}
