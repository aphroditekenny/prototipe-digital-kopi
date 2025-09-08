Berikut adalah gambaran arsitektur dan alur kerja (pipeline) 3D untuk platform KopiKala, yang mencakup fondasi teknis, proses produksi aset, implementasi *frontend*, layanan *backend*, dan strategi jaminan kualitas:

### **Arsitektur dan Alur Kerja (Pipeline) 3D KopiKala**

Platform KopiKala dirancang untuk menghadirkan pengalaman web 3D yang imersif dan berkinerja tinggi, mirip dengan aplikasi seluler asli, namun di lingkungan *browser* web yang lebih menantang. Arsitektur ini adalah kombinasi yang cermat antara *frontend* yang sangat dioptimalkan, *backend real-time* berkinerja tinggi, dan manajer *state* yang ringan.

#### **1. Fondasi Arsitektur Platform (Tumpukan Teknologi)**
Ini adalah pilar teknologi inti yang menjadi dasar seluruh pengalaman 3D:

*   **Frontend (Pengalaman Deklaratif Web 3D):**
    *   **Vue 3:** Kerangka kerja JavaScript fundamental, dipilih karena **Composition API** dan sintaks `<script setup>` yang memungkinkan organisasi logika kompleks dan *stateful* yang superior, serta menghasilkan ukuran *bundle* yang lebih kecil setelah minifikasi, krusial untuk kinerja web.
    *   **TresJS:** Perender kustom Vue untuk Three.js, memecahkan masalah "ketidakcocokan impedansi" antara kerangka kerja UI deklaratif dan pustaka 3D imperatif. Ini memungkinkan pembangunan adegan 3D secara **deklaratif menggunakan komponen Vue** (misalnya, `<TresMesh>`, `<TresPerspectiveCamera>`), yang menyederhanakan pengembangan, pemeliharaan, dan skalabilitas. Komponen `<TresCanvas>` secara otomatis mengatur `WebGLRenderer` dan *render loop* inti.
*   **Backend (Konkurensi Tinggi dan Real-Time):**
    *   **Go (Golang):** Digunakan untuk layanan *backend* berkonkurensi tinggi, mampu menangani ribuan koneksi pengguna secara bersamaan untuk pembaruan *real-time*. Dukungan bawaan Go untuk **goroutine dan channel** membuatnya lebih efisien daripada *runtime single-threaded* untuk operasi terikat CPU/I/O tinggi, memastikan respons latensi rendah.
    *   **Arsitektur Layanan Mikro:** *Backend* akan menggunakan pendekatan *microservices* dengan layanan-layanan khusus: **Layanan API REST** untuk pemuatan data awal dan **Layanan Real-Time** untuk koneksi WebSocket yang persisten.
*   **Manajemen State Terpusat:**
    *   **Pinia:** Pustaka manajemen *state* resmi yang direkomendasikan untuk Vue 3, menawarkan API yang lebih sederhana, intuitif, dan *type-safe*. *State* aplikasi akan distrukturkan ke dalam *store* berbasis fitur yang logis (misalnya, `useSceneStore`, `useProductStore`). *Store* Pinia berfungsi sebagai **sumber kebenaran tunggal** yang dapat diikat langsung ke properti objek Three.js melalui komponen TresJS.

#### **2. Alur Produksi Aset 3D: Dari Pembuatan hingga Penerapan**
Ini adalah proses *end-to-end* yang tidak dapat ditawar untuk semua aset 3D, memastikan optimisasi dan kualitas.

*   **Akuisisi dan Standardisasi Aset:**
    *   **Alur Kerja Pembuatan:** Merekomendasikan **fotogrametri** (*Structure-from-Motion*) untuk objek realistis, melibatkan pengambilan banyak foto dan rekonstruksi model *high-poly*.
    *   **Format Pengiriman Standar:** Semua aset harus dalam format **GLB (glTF 2.0 Binary)**, standar industri yang menggabungkan geometri, material, dan tekstur ke dalam satu file biner yang ringkas, dioptimalkan untuk pengiriman web dan pemuatan GPU yang dipercepat.
*   **Optimisasi Wajib (Inti Kinerja Web):**
    *   **Kompresi Geometri dengan Draco:** Semua file GLB wajib diproses dengan **kompresi Draco** untuk mengurangi ukuran data geometri 3D secara signifikan, menghasilkan waktu unduh yang lebih cepat. *Frontend* akan menggunakan `DRACOLoader` untuk mendekompilasi geometri ini secara asinkron, kemungkinan dalam batas `<Suspense>`.
    *   **Optimisasi dan Kompresi Tekstur:**
        *   **Batas Resolusi:** Maksimal **1024x1024 untuk seluler**, 2048x2048 untuk *hero assets* di desktop (dimuat secara kondisional). Dimensi harus **pangkat dua** untuk kinerja GPU optimal.
        *   **Kompresi Tingkat Lanjut:** Konversi ke format yang dioptimalkan GPU seperti **KTX2 dengan kompresi Basis Universal** untuk mengurangi jejak memori GPU.
    *   **Penyederhanaan dan Desimasi *Mesh*:** Model *high-poly* diretopologi menjadi versi *low-poly*. **Jumlah poligon tidak boleh melebihi 50.000 segitiga** per objek interaktif. Alat seperti "Decimate" di Blender atau InstaLOD akan digunakan.
*   **Praktik Pemodelan Berbasis Kinerja:**
    *   ***Level of Detail* (LOD):** Persyaratan inti untuk kinerja yang dapat diskalakan. Setidaknya **tiga versi (high-poly, medium-poly, low-poly)** untuk aset kompleks. Objek `LOD` Three.js secara otomatis beralih berdasarkan jarak dari kamera, memastikan GPU hanya me-*render* tingkat detail yang diperlukan.
    *   **Pengurangan *Draw Call*:** Mengurangi panggilan *draw call* ke GPU yang tinggi, yang merupakan hambatan kinerja utama.
        *   **Penggabungan Geometri:** Objek statis dengan material yang sama digabungkan menjadi satu geometri tunggal.
        *   ***Instanced Rendering*:** Untuk objek yang muncul berulang kali (misalnya, biji kopi), `InstancedMesh` digunakan untuk me-*render* semua *instance* dalam satu *draw call*.
*   **Daftar Periksa Optimisasi Aset 3D:** Tabel 1 menyediakan target dan alat yang jelas (misalnya, GLB, <50.000 segitiga, Draco, KTX2, 3 level LOD).

#### **3. Implementasi Frontend (Merancang Pengalaman Imersif)**
Bagaimana aset 3D digunakan dan di-*render* di sisi klien:

*   **Konstruksi Adegan Deklaratif:** Seluruh adegan 3D dibangun sebagai pohon komponen Vue di dalam `<TresCanvas>`, mencerminkan pohon DOM.
*   **Pencahayaan dan Lingkungan:** Kombinasi `TresAmbientLight`, `TresDirectionalLight` (dengan bayangan), dan peta lingkungan untuk refleksi *physically-based rendering* (PBR) pada material seperti `TresMeshStandardMaterial` digunakan untuk pencahayaan realistis.
*   **Memuat Model yang Dioptimalkan:** Model GLB dimuat menggunakan *composable* **`useGLTF` dari `@tresjs/cientos`**, yang membungkus `GLTFLoader` dan `DRACOLoader` untuk menangani pemuatan dan dekompresi asinkron, bekerja dengan komponen `<Suspense>` Vue untuk manajemen *state* pemuatan.
*   **Lingkungan 3D Reaktif:** *State* Pinia diikat langsung ke properti objek Three.js (misalnya, `<TresMeshStandardMaterial :color="productStore.activeColor" />`), memungkinkan perubahan objek 3D secara *real-time* saat UI 2D berinteraksi.
*   **Animasi Tingkat Lanjut:**
    *   **`useLoop` dari TresJS:** Untuk animasi berkelanjutan (misalnya, rotasi produk, uap naik), menggunakan *hook* `onBeforeRender` berbasis `requestAnimationFrame`.
    *   **GreenSock Animation Platform (GSAP):** Untuk animasi kompleks, berbasis *timeline*, dan interaktif (misalnya, memindahkan kamera, transisi "elemen bersama" dengan plugin GSAP Flip untuk mengubah gambar 2D menjadi objek 3D 3D).
*   **Fidelitas dan Responsivitas Lintas Perangkat:**
    *   **Kanvas Responsif:** `<TresCanvas>` mengisi wadah induknya dengan CSS standar. `ResizeObserver` atau *event listener* `resize` memperbarui ukuran *renderer* dan rasio aspek kamera untuk mencegah distorsi.
    *   **Strategi Kamera yang Mengutamakan Seluler:** Penyesuaian FOV dinamis untuk memastikan subjek utama mempertahankan ukuran yang konsisten di semua rasio aspek (efek "contain").
    *   **Kontrol Sentuh Intuitif:** *Helper* **`OrbitControls` dari `@tresjs/cientos`** menyediakan gerakan sentuh standar (seret satu jari untuk mengorbit, cubit dua jari untuk memperbesar, seret dua jari untuk menggeser). Perhatian diberikan untuk mencegah pembajakan pengguliran halaman.

#### **4. Layanan Backend untuk Dunia yang Dinamis**
Arsitektur sisi *server* yang mendukung aplikasi web 3D yang dinamis, interaktif, dan dapat diskalakan.

*   **Desain API Hibrida:**
    *   **API REST (Go):** Melayani data statis awal (katalog produk, otentikasi pengguna, konfigurasi adegan) untuk pemuatan awal yang efisien dan dapat di-*cache*.
    *   **Lapisan WebSocket (Go):** Menjadi inti pengalaman interaktif, mengelola koneksi persisten untuk pembaruan *real-time* (perubahan harga, stok), menyinkronkan *state* antar pengguna, dan menangani interaksi yang memerlukan pemrosesan *server*. Ini lebih efisien untuk komunikasi dua arah yang sesungguhnya.
*   **Arsitektur Skalabilitas dan Latensi Rendah:**
    *   **Layanan Go yang Dapat Diskalakan Horizontal:** Layanan Go dirancang *stateless* dan dikemas dalam kontainer (misalnya, Docker) untuk memungkinkan beberapa *instance* berjalan di belakang *load balancer*.
    *   **Redis untuk *Caching* dan Pub/Sub:**
        *   **Lapisan *Caching*:** Menyimpan data yang sering diakses untuk pengambilan instan.
        *   ***Broker* Pub/Sub:** Redis Pub/Sub bertindak sebagai *bus* pesan berkecepatan tinggi antar *instance* layanan Go, memastikan semua klien menerima pembaruan *real-time* terlepas dari *server* mana mereka terhubung. Ini adalah kunci untuk **skalabilitas horizontal sejati** dari komponen *real-time*, memisahkan *server* aplikasi Go dan memungkinkan mereka tetap *stateless*.

#### **5. Strategi Jaminan Kualitas dan Kinerja**
Memastikan fidelitas visual dan kinerja yang diperlukan untuk pengalaman imersif.

*   **Penganggaran Kinerja dan Pemantauan Berkelanjutan:**
    *   **KPI Kinerja:** Target **60 FPS yang konsisten**, kurang dari 200 *draw call* per *frame*, dan pemantauan Core Web Vitals (TBT, LCP) serta waktu muat aset 3D.
    *   **Pemantauan *Real-Time*:** **`stats.js`** (melalui komponen `<Stats />` di `cientos`) menyediakan tampilan di layar untuk FPS, penggunaan memori, dan waktu *render* selama pengembangan.
    *   **Audit Otomatis:** **Google Lighthouse** diintegrasikan ke dalam alur kerja CI/CD untuk memeriksa regresi kinerja, aksesibilitas, dan praktik terbaik secara otomatis.
*   **Pengujian Otomatis untuk WebGL:**
    *   ***End-to-End* (E2E) dengan Playwright:** Menggunakan **Playwright** (dengan dukungan GPU yang dikonfigurasi dan akselerasi perangkat keras di *runner* CI) untuk mensimulasikan interaksi pengguna dan memverifikasi perubahan *state*.
    *   **Pengujian Regresi Visual:** Alur kerja pengujian regresi visual dengan **Percy atau Applitools** diimplementasikan. Ini mengambil *screenshot* elemen `<canvas>` pada *state* tertentu, membandingkannya dengan gambar dasar yang disetujui, dan menyoroti perbedaan tingkat piksel untuk ditinjau manusia.

Dengan alur kerja dan arsitektur ini, KopiKala memastikan bahwa pengalaman 3D yang imersif dan berkinerja tinggi dapat disampaikan secara konsisten di berbagai perangkat dan ukuran layar.