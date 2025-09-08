Berikut adalah **alur kerja optimisasi arsitektur** yang komprehensif untuk platform KopiKala, yang berfokus pada kinerja, skalabilitas, dan pengalaman pengguna yang mulus dalam lingkungan web 3D:

### **Alur Kerja Optimisasi Arsitektur 3D KopiKala**

Optimisasi arsitektur KopiKala adalah pendekatan holistik yang mencakup fondasi teknis, proses produksi aset, implementasi *frontend*, layanan *backend*, dan strategi jaminan kualitas. Ini dirancang untuk memastikan bahwa kinerja adalah prinsip desain utama, bukan sekadar pelengkap.

#### **1. Fondasi Arsitektur yang Dioptimalkan (Tumpukan Teknologi)**
Pilihan teknologi inti dirancang untuk kinerja dan skalabilitas sejak awal:

*   **Frontend (Vue 3 dan TresJS):**
    *   **Vue 3** dipilih karena **Composition API** dan sintaks `<script setup>` yang memungkinkan organisasi logika yang kompleks menjadi lebih baik, penggunaan ulang kode yang lebih efisien, dan ukuran *bundle* produksi yang lebih kecil setelah minifikasi. Ini krusial untuk waktu muat awal.
    *   **TresJS** (perender kustom Vue untuk Three.js) memecahkan masalah "ketidakcocokan impedansi" antara kerangka kerja UI deklaratif dan pustaka 3D imperatif. Ini memungkinkan pembangunan adegan 3D secara **deklaratif menggunakan komponen Vue**, menyederhanakan pengembangan, pemeliharaan, dan skalabilitas. Komponen `<TresCanvas>` mengotomatisasi pengaturan `WebGLRenderer` dan *render loop* inti, mengurangi kode *boilerplate*.
*   **Backend (Go dan Layanan Mikro):**
    *   **Go (Golang)** digunakan untuk layanan *backend* berkonkurensi tinggi, mampu menangani ribuan koneksi pengguna secara bersamaan untuk pembaruan *real-time*. Dukungan bawaan Go untuk **goroutine dan channel** membuatnya lebih efisien daripada *runtime single-threaded* untuk operasi yang terikat CPU/I/O, memastikan respons latensi rendah.
    *   Pendekatan **layanan mikro** digunakan dengan layanan-layanan khusus: **API REST** untuk pemuatan data awal yang dapat di-*cache*, **Layanan Real-Time** untuk koneksi WebSocket yang persisten, dan **Layanan Pengiriman Aset** yang terintegrasi dengan CDN.
*   **Manajemen State (Pinia):**
    *   **Pinia** adalah pustaka manajemen *state* resmi untuk Vue 3 yang menawarkan API sederhana, intuitif, dan *type-safe*. *State* aplikasi distrukturkan ke dalam *store* berbasis fitur.
    *   *Store* Pinia berfungsi sebagai **sumber kebenhan tunggal**, dan komponen 3D TresJS dapat **mengikat *state* ini secara langsung ke properti objek Three.js**. Ini menciptakan *loop* reaktif yang kuat antara UI 2D, *state* global, dan adegan 3D, memungkinkan perubahan objek 3D secara *real-time* dan otomatis tanpa intervensi manual.

#### **2. Alur Produksi Aset 3D (Optimisasi Inti untuk Kinerja Web)**
Ini adalah proses *end-to-end* yang **tidak dapat ditawar** untuk semua aset 3D, memastikan optimisasi dan kualitas sebagai gerbang kualitas yang ketat:

*   **Akuisisi dan Standardisasi Aset:**
    *   **Fotogrametri** direkomendasikan untuk objek realistis, yang menghasilkan model *high-poly*.
    *   Semua aset harus dalam format **GLB (glTF 2.0 Binary)**, standar industri yang menggabungkan geometri, material, dan tekstur ke dalam satu file biner yang ringkas dan dioptimalkan untuk pengiriman web serta pemuatan GPU.
*   **Optimisasi Wajib (Inti Kinerja Web):**
    *   **Kompresi Geometri dengan Draco:** Semua file GLB wajib diproses dengan **kompresi Draco** untuk mengurangi ukuran data geometri 3D secara signifikan, menghasilkan waktu unduh yang lebih cepat. *Frontend* akan menggunakan `DRACOLoader` untuk mendekompilasi geometri ini secara asinkron, mungkin dalam batas `<Suspense>` Vue, untuk mencegah pemblokiran *main thread*.
    *   **Optimisasi dan Kompresi Tekstur:**
        *   **Batas Resolusi:** Maksimal **1024x1024 untuk seluler**, 2048x2048 untuk *hero assets* di desktop (dimuat secara kondisional). Dimensi harus **pangkat dua** untuk kinerja GPU optimal.
        *   **Kompresi Tingkat Lanjut:** Konversi ke format yang dioptimalkan GPU seperti **KTX2 dengan kompresi Basis Universal** untuk mengurangi jejak memori GPU.
    *   **Penyederhanaan dan Desimasi *Mesh*:** Model *high-poly* diretopologi menjadi versi *low-poly*. **Jumlah poligon tidak boleh melebihi 50.000 segitiga** per objek interaktif. Alat seperti "Decimate" di Blender atau InstaLOD akan digunakan.
*   **Praktik Pemodelan Berbasis Kinerja:**
    *   ***Level of Detail* (LOD):** Persyaratan inti untuk kinerja yang dapat diskalakan. Setidaknya **tiga versi (high-poly, medium-poly, low-poly)** untuk aset kompleks. Objek `LOD` Three.js secara otomatis beralih berdasarkan jarak dari kamera, memastikan GPU hanya me-*render* tingkat detail yang diperlukan.
    *   **Pengurangan *Draw Call*:** Mengurangi panggilan *draw call* ke GPU yang tinggi dengan:
        *   **Penggabungan Geometri:** Objek statis dengan material yang sama digabungkan menjadi satu geometri tunggal.
        *   ***Instanced Rendering*:** Untuk objek yang muncul berulang kali, `InstancedMesh` digunakan untuk me-*render* semua *instance* dalam satu *draw call*.
*   **Daftar Periksa Optimisasi Aset 3D (Gerbang Kualitas):** Tabel 1 (dalam sumber) berfungsi sebagai gerbang kualitas definitif dengan target dan alat yang jelas (misalnya, GLB, <50.000 segitiga, Draco, KTX2, 3 level LOD).

#### **3. Implementasi Frontend (Merancang Pengalaman yang Responsif dan Efisien)**
Penggunaan komponen TresJS dan strategi animasi yang terencana mengoptimalkan pengalaman pengguna:

*   **Pemuatan Model yang Dioptimalkan:** *Composable* `useGLTF` dari `@tresjs/cientos` membungkus `GLTFLoader` dan `DRACOLoader` untuk menangani pemuatan dan dekompresi asinkron secara mulus, bekerja dengan komponen `<Suspense>` Vue untuk manajemen *state* pemuatan.
*   **Animasi Tingkat Lanjut:**
    *   **`useLoop` dari TresJS** untuk animasi berkelanjutan dan *stateful* (misalnya, rotasi produk) yang terikat langsung ke `requestAnimationFrame` perender, sangat efisien untuk perilaku ambien.
    *   **GreenSock Animation Platform (GSAP)** untuk animasi kompleks, berbasis *timeline*, dan interaktif (misalnya, memindahkan kamera, transisi "elemen bersama" dengan plugin GSAP Flip untuk mengubah gambar 2D menjadi objek 3D). Kombinasi ini menciptakan sistem animasi dua tingkat untuk kinerja dan fleksibilitas.
*   **Fidelitas dan Responsivitas Lintas Perangkat:**
    *   **Kanvas Responsif:** `<TresCanvas>` mengisi wadah induknya dengan CSS standar. `ResizeObserver` atau *event listener* `resize` memperbarui ukuran *renderer* dan rasio aspek kamera untuk mencegah distorsi.
    *   **Strategi Kamera yang Mengutamakan Seluler:** Penyesuaian *Field of View* (FOV) dinamis untuk memastikan subjek utama mempertahankan ukuran yang konsisten di semua rasio aspek (efek "contain").
    *   **Kontrol Sentuh Intuitif:** *Helper* `OrbitControls` dari `@tresjs/cientos` menyediakan gerakan sentuh standar (seret satu jari untuk mengorbit, cubit dua jari untuk memperbesar, seret dua jari untuk menggeser).

#### **4. Layanan Backend (Skalabilitas dan Latensi Rendah)**
Arsitektur *server* dirancang untuk mendukung interaktivitas dinamis dan pertumbuhan:

*   **Desain API Hibrida:**
    *   **API REST (Go):** Melayani data statis awal yang dapat di-*cache* untuk pemuatan halaman yang efisien.
    *   **Lapisan WebSocket (Go):** Mengelola koneksi persisten untuk pembaruan *real-time* (perubahan harga, stok), menyinkronkan *state* antar pengguna, dan menangani interaksi yang memerlukan pemrosesan *server*. Ini jauh lebih efisien untuk komunikasi dua arah yang sesungguhnya daripada *long-polling*.
*   **Arsitektur Skalabilitas:**
    *   **Layanan Go yang Dapat Diskalakan Horizontal:** Layanan Go dirancang *stateless* dan dikemas dalam kontainer (misalnya, Docker) untuk memungkinkan beberapa *instance* berjalan di belakang *load balancer*.
    *   **Redis untuk *Caching* dan Pub/Sub:**
        *   **Lapisan *Caching*:** Menyimpan data yang sering diakses di memori untuk pengambilan instan.
        *   ***Broker* Pub/Sub:** Redis Pub/Sub bertindak sebagai *bus* pesan berkecepatan tinggi antar *instance* layanan Go, memastikan semua klien menerima pembaruan *real-time* terlepas dari *server* mana mereka terhubung. Ini adalah kunci untuk **skalabilitas horizontal sejati** dari komponen *real-time* dan memungkinkan layanan Go tetap *stateless*.

#### **5. Strategi Jaminan Kualitas dan Kinerja (Verifikasi Berkelanjutan)**
Strategi pengujian dan pemantauan berlapis yang disesuaikan untuk tantangan WebGL 3D:

*   **Penganggaran Kinerja dan Pemantauan Berkelanjutan:**
    *   **KPI Kinerja yang Ketat:** Target **60 FPS yang konsisten**, kurang dari 200 *draw call* per *frame*, dan pemantauan Core Web Vitals (TBT, LCP) serta waktu muat aset 3D.
    *   **Pemantauan *Real-Time*:** **`stats.js`** (melalui komponen `<Stats />` di `@tresjs/cientos`) menyediakan tampilan di layar untuk FPS, penggunaan memori, dan waktu *render* selama pengembangan.
    *   **Audit Otomatis:** **Google Lighthouse** diintegrasikan ke dalam alur kerja CI/CD untuk memeriksa regresi kinerja, aksesibilitas, dan praktik terbaik secara otomatis.
*   **Pengujian Otomatis untuk WebGL:**
    *   ***End-to-End* (E2E) dengan Playwright:** Menggunakan **Playwright** untuk mensimulasikan interaksi pengguna dan memverifikasi perubahan *state*. *Runner* CI dikonfigurasi dengan dukungan GPU dan akselerasi perangkat keras untuk mencerminkan kinerja rendering dunia nyata secara akurat.
    *   **Pengujian Regresi Visual:** Alur kerja pengujian regresi visual dengan **Percy atau Applitools** diimplementasikan. Ini mengambil *screenshot* elemen `<canvas>` pada *state* tertentu, membandingkannya dengan gambar dasar yang disetujui, dan menyoroti perbedaan tingkat piksel untuk ditinjau manusia, mengotomatiskan QA visual.

#### **6. Peta Jalan Implementasi Strategis**
Peta jalan mengutamakan fondasi kinerja:

*   **Fase 1: Fondasi dan Alur Produksi (Bulan 1-2):** Membangun dan mengotomatisasi seluruh **alur optimisasi aset 3D (Bagian II)** sebelum pengembangan fitur signifikan dimulai. Ini adalah langkah *de-risking* kritis untuk mencegah pengerjaan ulang yang mahal.
*   **Fase 2-4:** Pengalaman inti, fitur lanjutan, dan QA terintegrasi dengan pengujian E2E dan regresi visual.

Alur kerja dan arsitektur ini secara kolektif memastikan bahwa platform KopiKala dapat menghadirkan pengalaman 3D yang imersif dan berkinerja tinggi, yang disesuaikan untuk lingkungan web yang menantang.