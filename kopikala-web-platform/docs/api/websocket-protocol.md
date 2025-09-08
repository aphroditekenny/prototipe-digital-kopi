KopiKala akan mengimplementasikan **protokol WebSocket** sebagai komponen kunci dalam arsitektur *backend* hibridanya, khususnya untuk menangani komunikasi *real-time* dan interaksi dinamis.

Berikut adalah detail mengenai protokol WebSocket yang akan digunakan oleh platform KopiKala:

### **Protokol WebSocket untuk Platform KopiKala**

1.  **Tujuan Utama (Komunikasi Real-Time dan Dinamis)**:
    *   WebSocket akan menjadi **protokol komunikasi utama untuk semua pembaruan dinamis dan interaksi *real-time*** setelah *frontend* diinisialisasi.
    *   Protokol ini dirancang untuk mendukung pengalaman 3D yang dinamis dan berkinerja tinggi yang membutuhkan komunikasi dua arah dengan latensi rendah.

2.  **Sifat dan Model Komunikasi**:
    *   WebSocket menyediakan **komunikasi dua arah yang persisten** antara klien (peramban *frontend*) dan server. Ini lebih efisien daripada *long-polling* atau *Server-Sent Events* untuk kebutuhan komunikasi dua arah sejati.
    *   Model komunikasi platform KopiKala adalah **hibrida**: pemuatan halaman awal menggunakan API RESTful untuk mengambil *state* dasar adegan, dan setelah itu, koneksi WebSocket dibuat untuk semua pembaruan dinamis.

3.  **Layanan yang Disediakan (Services)**:
    *   Akan ada **Layanan Real-Time khusus** di *backend* yang mengelola koneksi WebSocket yang persisten.
    *   Layanan ini bertanggung jawab untuk:
        *   **Menyiarkan pembaruan *real-time*** (misalnya, perubahan harga, tingkat stok).
        *   **Menyinkronkan *state*** antara pengguna dalam pengalaman bersama.
        *   **Menangani interaksi pengguna** yang memerlukan validasi atau pemrosesan sisi server (misalnya, melakukan pemesanan).

4.  **Teknologi Implementasi**:
    *   Lapisan WebSocket akan dibangun dengan **Go (Golang)**.
    *   Dukungan bawaan Go untuk **konkurensi melalui *goroutine* dan *channel*** membuatnya sangat cocok untuk menangani ribuan koneksi pengguna secara bersamaan, jauh lebih efisien daripada *runtime single-threaded* seperti Node.js untuk operasi yang terikat CPU atau I/O tinggi.
    *   Sifat Go yang dikompilasi dan manajemen memori yang efisien memastikan respons dengan latensi rendah, yang sangat penting untuk mempertahankan ilusi dunia 3D yang hidup dan interaktif.

5.  **Arsitektur untuk Skalabilitas dan Latensi Rendah**:
    *   Layanan Go yang mengelola WebSocket akan dirancang agar ***stateless*** dan dikemas dalam kontainer (misalnya, menggunakan Docker), memungkinkan **skalabilitas horizontal** dengan menjalankan beberapa *instance* di belakang *load balancer*.
    *   Untuk memungkinkan skalabilitas horizontal sejati dan memastikan semua klien menerima pembaruan *real-time* terlepas dari server mana mereka terhubung, **Redis akan diintegrasikan sebagai *broker* Pub/Sub**. Redis Pub/Sub akan bertindak sebagai *bus* pesan berkecepatan tinggi antar *instance* layanan Go, memisahkan server aplikasi Go dan memungkinkan mereka untuk tetap *stateless*. Ini adalah kunci untuk mengubah komponen *real-time* dari solusi server tunggal menjadi platform tingkat perusahaan yang dapat diskalakan secara horizontal.

Singkatnya, protokol WebSocket di KopiKala adalah tulang punggung untuk **interaktivitas *real-time* dan pengalaman 3D yang dinamis**, memungkinkan pembaruan data yang cepat, sinkronisasi antar pengguna, dan penanganan interaksi yang membutuhkan pemrosesan server. Ini didukung oleh *backend* Go yang berkinerja tinggi dan dirancang untuk skalabilitas horizontal menggunakan Redis sebagai *broker* Pub/Sub.