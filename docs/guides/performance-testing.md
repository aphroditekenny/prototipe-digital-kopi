Panduan pengujian kinerja adalah komponen kunci dari strategi jaminan kualitas dan kinerja komprehensif untuk platform KopiKala. Pengujian ini dirancang secara khusus untuk mengatasi tantangan unik dari aplikasi WebGL 3D, di mana praktik QA standar saja tidak cukup untuk menjamin ketepatan visual dan kinerja yang diperlukan untuk pengalaman imersif.

Berikut adalah panduan pengujian kinerja yang komprehensif:

### **Panduan Pengujian Kinerja (Performance Testing Guide) KopiKala**

#### **1. Pendahuluan: Pentingnya Jaminan Kualitas & Kinerja**
Dalam membangun pengalaman web 3D yang imersif seperti KopiKala, kinerja harus diperlakukan sebagai **prinsip desain utama, bukan sekadar pemikiran di akhir proyek**. Arsitektur yang dipilih, mulai dari *frontend* yang sangat dioptimalkan hingga *backend real-time* berkinerja tinggi, secara kolektif menciptakan fondasi di mana kinerja adalah inti. Oleh karena itu, strategi pengujian dan pemantauan berlapis diperlukan untuk memastikan pengalaman aplikasi seluler asli dapat diterjemahkan ke lingkungan peramban web yang lebih menantang.

#### **2. Menetapkan Anggaran Kinerja (Performance Budgets)**
Sebelum pengembangan dimulai, **anggaran kinerja yang ketat harus ditentukan**. Metrik utama (*Key Performance Indicators* - KPI) ini akan dipantau secara proaktif sepanjang siklus hidup pengembangan:
*   **Frame Per Detik (FPS)**: Targetnya adalah menjaga **60 FPS yang konsisten**.
*   ***Draw Calls***: Harus dijaga **di bawah 200 per *frame*** jika memungkinkan, karena *draw call* yang tinggi merupakan hambatan kinerja utama.
*   ***Total Blocking Time* (TBT) & *Largest Contentful Paint* (LCP)**: Core Web Vitals ini tetap relevan dan akan dipantau secara cermat.
*   **Waktu Muat Aset**: Mengacu pada waktu yang dibutuhkan untuk mengunduh dan mendekode model 3D. Keputusan seperti penggunaan kompresi Draco memengaruhi waktu unduh yang lebih cepat dengan mengorbankan biaya CPU untuk dekompresi.

#### **3. Metode Pengujian dan Pemantauan Kinerja**

##### **3.1. Pemantauan *Real-Time* Selama Pengembangan (dengan stats.js)**
*   **Tujuan**: Memberikan umpan balik langsung kepada pengembang tentang dampak kinerja dari perubahan kode yang mereka buat.
*   **Implementasi**: Pustaka **stats.js** akan diintegrasikan selama fase pengembangan. Ini tersedia melalui komponen `<Stats />` di `@tresjs/cientos`.
*   **Fungsi**: Menyediakan tampilan di layar mengenai **FPS, penggunaan memori, dan waktu *render*** secara *real-time*.

##### **3.2. Audit Otomatis (dengan Google Lighthouse)**
*   **Tujuan**: Mencegah penurunan kinerja digabungkan ke cabang utama dengan secara otomatis memeriksa regresi.
*   **Implementasi**: **Google Lighthouse** akan diintegrasikan ke dalam alur kerja CI/CD (Continuous Integration/Continuous Deployment).
*   **Fungsi**: Setiap *pull request* akan memicu audit Lighthouse secara otomatis untuk memeriksa regresi dalam **kinerja, aksesibilitas, dan praktik terbaik**.

##### **3.3. Pengujian End-to-End (E2E) Khusus WebGL (dengan Playwright)**
*   **Tantangan**: Kerangka kerja pengujian E2E tradisional sering kali gagal dengan WebGL karena ketidakmampuannya berinteraksi dengan elemen `<canvas>`.
*   **Solusi**: **Playwright** akan digunakan karena kemampuannya dalam otomatisasi peramban yang lebih kuat.
*   **Konfigurasi Kritis**:
    *   *Runner* CI akan dikonfigurasi dengan **dukungan GPU**.
    *   Playwright akan diluncurkan dengan *flag* untuk **mengaktifkan akselerasi perangkat keras** (misalnya, `--use-angle=gl`). Ini penting untuk memastikan pengujian di lingkungan *headless* secara akurat mencerminkan kinerja dan stabilitas *rendering* dunia nyata.
*   **Fungsi**: Pengujian E2E akan mensimulasikan interaksi pengguna dan memverifikasi perubahan *state* yang dihasilkan dalam aplikasi 3D.

##### **3.4. Pengujian Regresi Visual untuk Adegan 3D (dengan Percy/Applitools)**
*   **Tantangan**: Pengujian fungsional tidak dapat menangkap *bug* visual yang tidak disengaja, seperti tekstur tidak dimuat atau model tampak terdistorsi.
*   **Solusi**: Alur kerja pengujian regresi visual akan diimplementasikan menggunakan layanan seperti **Percy atau Applitools**.
*   **Proses**:
    1.  Pengujian E2E akan menavigasi aplikasi ke *state* tertentu.
    2.  Pada saat-saat penting, animasi akan dijeda secara terprogram.
    3.  Tangkapan layar dari elemen `<canvas>` akan diambil dan dikirim ke layanan pengujian visual.
    4.  Layanan akan membandingkan tangkapan layar ini dengan gambar dasar yang telah disetujui, menyoroti setiap perbedaan tingkat piksel untuk ditinjau oleh manusia. Proses ini mengotomatiskan QA visual manual yang membosankan dan rawan kesalahan.

#### **4. Integrasi ke dalam Alur Kerja CI/CD**
*   **Pergeseran Paradigma**: Dengan mengintegrasikan pengujian kinerja dan regresi visual ke dalam alur kerja CI/CD, jaminan kualitas diubah dari aktivitas reaktif pasca-pengembangan menjadi disiplin **proaktif dan preventif**.
*   **Kegagalan Otomatis *Pull Request***: Sebuah *pull request* yang menyebabkan skor kinerja turun di bawah ambang batas yang ditetapkan atau memperkenalkan perbedaan visual akan **secara otomatis gagal dalam pemeriksaannya**. Hal ini menciptakan budaya di mana kinerja dan ketepatan visual diperlakukan sebagai persyaratan kelas satu, sama seperti kebenaran fungsional.

#### **5. Strategi Mitigasi Risiko Kinerja**
*   **Variabilitas Kinerja Seluler**: Kinerja dapat sangat bervariasi di berbagai perangkat seluler karena GPU dan implementasi peramban yang berbeda.
    *   **Mitigasi**: Terapkan alur optimisasi aset secara agresif, terutama Level of Detail (LOD). Lakukan pengujian kinerja berkelanjutan pada berbagai perangkat nyata, bukan hanya emulator.
*   **Inkonsistensi API Peramban**: WebGL dan API web terkait dapat memiliki perbedaan halus antar peramban (Chrome, Firefox, Safari).
    *   **Mitigasi**: Manfaatkan pustaka seperti Three.js yang mengabstraksi banyak dari inkonsistensi ini. Terapkan strategi pengujian lintas peramban yang kuat sebagai bagian dari alur kerja CI/CD menggunakan layanan seperti BrowserStack.

#### **6. Peta Jalan Implementasi**
*   **Fase 4: QA dan Peluncuran (Bulan 8)**: Peta jalan pengembangan mengalokasikan fase khusus untuk implementasi *suite* pengujian E2E dan regresi visual penuh, bersama dengan Pengujian Penerimaan Pengguna (UAT) dan penerapan ke produksi.

Dengan menerapkan panduan pengujian kinerja ini, platform KopiKala dapat memastikan bahwa pengalaman imersif 3D yang ditawarkannya tidak hanya visual yang memukau, tetapi juga berkinerja tinggi dan stabil di berbagai perangkat dan lingkungan peramban.