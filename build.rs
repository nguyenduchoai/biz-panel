// build.rs - Tell Cargo to rebuild when static files change
fn main() {
    println!("cargo:rerun-if-changed=static/js/app.js");
    println!("cargo:rerun-if-changed=static/css/main.css");
}
