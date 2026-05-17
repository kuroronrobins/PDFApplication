#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().any(|arg| arg == "--toolhub-smoke") {
        std::process::exit(pdf_workbench_lib::run_toolhub_smoke());
    }

    pdf_workbench_lib::run()
}
