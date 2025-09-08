### **Panduan untuk Pengalaman 3D yang Responsif (Responsive 3D Experience Guide)**

Membangun pengalaman web 3D yang imersif seperti KopiKala memerlukan pendekatan yang hati-hati untuk memastikan fidelitas dan responsivitas di berbagai perangkat, dari ponsel hingga monitor desktop besar. Strategi ini adalah inti untuk menerjemahkan pengalaman aplikasi seluler asli, yang memiliki lebih sedikit kendala kinerja, ke lingkungan peramban web yang lebih menantang.

  #### **1. Dasar Kanvas 3D yang Responsif**
  Untuk memastikan adegan 3D menyesuaikan diri dengan berbagai ukuran layar, implementasi dasar harus berfokus pada kanvas itu sendiri:
  *   **Konfigurasi Kanvas:** Komponen `<TresCanvas>` harus dikonfigurasi untuk **mengisi wadah induknya**.
  *   **CSS Standar:** Gunakan CSS standar untuk memastikan bahwa wadah induk kanvas responsif terhadap perubahan ukuran *viewport*.
  *   **Pembaruan Dinamis:** Manfaatkan `ResizeObserver` atau *event listener* `resize` jendela untuk **memperbarui ukuran *renderer* dan rasio aspek kamera** setiap kali *viewport* berubah. Ini adalah persyaratan fundamental untuk mencegah distorsi visual pada adegan 3D.

      ```javascript
      // Dalam composable atau komponen Vue
      window.addEventListener('resize', () => {
          // Asumsikan 'renderer' dan 'camera' dapat diakses
          renderer.setSize(window.innerWidth, window.innerHeight);
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
      });
      ```
   

#### **2. Strategi Kamera yang Mengutamakan Seluler**
Perangkat seluler umumnya memiliki rasio aspek vertikal, sementara desktop memiliki rasio aspek horizontal. Strategi kamera harus memperhitungkan perbedaan ini:
*   **Masalah FOV Tetap:** *Field of View* (FOV) vertikal yang tetap dapat menyebabkan objek tampak terlalu kecil di layar lebar atau sisi-sisinya terpotong di layar tinggi.
*   **Penyesuaian FOV Dinamis:** Terapkan strategi penyesuaian FOV dinamis untuk memastikan bahwa subjek utama **mempertahankan ukuran yang dirasakan konsisten di semua rasio aspek**. Hal ini menciptakan efek "contain" (mengandung) daripada "cover" (menutupi), yang penting untuk menjaga pengalaman visual yang konsisten dan menarik.

#### **3. Kontrol Interaktif Lintas Perangkat**
Interaksi pengguna harus intuitif dan berfungsi mulus di perangkat sentuh dan *mouse*:
*   **Kontrol Sentuh Intuitif:** Untuk pengguna web seluler, kontrol sentuh yang intuitif adalah keharusan. Gunakan *helper* **`OrbitControls`** (tersedia di `@tresjs/cientos`) untuk menyediakan gerakan sentuh standar:
    *   **Seret satu jari** untuk mengorbit.
    *   **Cubit dua jari** untuk memperbesar.
    *   **Seret dua jari** untuk menggeser.
*   **Pencegahan Pembajakan Pengguliran:** Pastikan kontrol 3D **tidak membajak pengguliran halaman** ketika kanvas 3D adalah bagian dari halaman yang dapat digulir lebih besar.

#### **4. Optimisasi Aset untuk Kinerja Responsif**
Optimisasi aset adalah kunci untuk memastikan kinerja yang baik di semua perangkat, terutama seluler:
*   **Resolusi Tekstur:**
    *   **Maksimal 1024x1024** direkomendasikan untuk pengalaman yang mengutamakan seluler.
    *   Tekstur yang lebih besar (maksimal 2048x2048) dapat digunakan untuk *hero assets* di desktop, tetapi harus **dimuat secara kondisional**.
    *   Dimensi tekstur harus merupakan **pangkat dua** (*power of two*) untuk kinerja GPU yang optimal.
*   ***Level of Detail* (LOD):** Ini adalah persyaratan inti untuk kinerja yang dapat diskalakan.
    *   Untuk aset yang kompleks, buat **setidaknya tiga versi:** *high-poly* (untuk tampilan dekat), *medium-poly*, dan *low-poly* (untuk tampilan jauh).
    *   Objek `LOD` di Three.js secara otomatis beralih di antara model-model ini berdasarkan jaraknya dari kamera, **memastikan GPU hanya me-*render* tingkat detail yang diperlukan**.

#### **5. Mitigasi Risiko Kinerja dan Kompatibilitas**
Mengingat keragaman perangkat dan peramban, penting untuk mengantisipasi dan memitigasi potensi masalah:
*   **Variabilitas Kinerja Seluler:** Kinerja dapat bervariasi secara signifikan di berbagai perangkat seluler karena perbedaan GPU dan implementasi peramban.
    *   **Mitigasi:** Terapkan **alur optimisasi aset secara agresif** (terutama LOD) dan lakukan **pengujian kinerja berkelanjutan pada berbagai perangkat nyata**, bukan hanya emulator.
*   **Inkonsistensi API Peramban:** WebGL dan API web terkait dapat memiliki perbedaan halus antar peramban (Chrome, Firefox, Safari).
    *   **Mitigasi:** Manfaatkan pustaka seperti Three.js yang mengabstraksi banyak dari inkonsistensi ini. Terapkan **strategi pengujian lintas peramban yang kuat** sebagai bagian dari alur kerja CI/CD menggunakan layanan seperti BrowserStack.

Dengan menerapkan panduan ini, platform KopiKala dapat memastikan bahwa pengalaman 3D yang imersif dan berkinerja tinggi dapat dinikmati secara konsisten oleh pengguna di berbagai perangkat dan ukuran layar.