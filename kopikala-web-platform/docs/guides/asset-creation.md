Penting untuk memahami bahwa alur kerja produksi aset 3D bukan hanya tentang kreasi visual, melainkan **alur kerja yang tidak dapat ditawar dan wajib** untuk memastikan kinerja tinggi di platform web KopiKala. Ini berfungsi sebagai "gerbang kualitas yang ketat" dan "kontrak organisasi antara tim desain dan rekayasa". Aset yang dioptimalkan dengan buruk dapat merusak pengalaman pengguna secara keseluruhan, terlepas dari kualitas arsitektur aplikasi.

Berikut adalah panduan terperinci untuk pembuatan dan optimisasi aset 3D:

### **Panduan Pembuatan & Optimisasi Aset 3D untuk KopiKala**

#### **1. Akuisisi dan Standardisasi Aset**
Langkah awal adalah memastikan bahwa semua aset dibuat dan diformat secara konsisten untuk web.

*   **Alur Kerja Pembuatan Aset**:
    *   Untuk objek realistis, **fotogrametri ( *Structure-from-Motion* )** direkomendasikan. Proses ini melibatkan pengambilan banyak foto objek dari berbagai sudut untuk merekonstruksi model 3D *high-poly*.
*   **Format Pengiriman Standar: GLB**:
    *   Semua aset akhir yang siap untuk web harus dikirimkan dalam format **GLB (glTF 2.0 Binary)**. GLB adalah standar industri untuk web 3D yang menggabungkan geometri, material, dan tekstur ke dalam satu file biner yang ringkas. Format ini dioptimalkan untuk pengiriman web dan pemuatan yang dipercepat oleh GPU, menjadikannya pilihan yang paling efisien.
    *   **Alat yang Direkomendasikan**: Blender, Maya2glTF, gltf.report.

#### **2. Optimisasi Wajib: Inti dari Kinerja Web**
Optimisasi adalah **bagian integral dan bukan opsional** dari alur produksi aset. Setiap aset harus melalui serangkaian langkah optimisasi yang ketat sebelum dianggap siap produksi. Tim seniman 3D bertanggung jawab atas jumlah poligon dan pembuatan LOD, sementara pengembang bertanggung jawab atas implementasi *loader* dan logika *instancing*.

*   **Kompresi Geometri dengan Draco**:
    *   **Tujuan**: Mengurangi ukuran data geometri 3D (seperti posisi dan normal) secara signifikan. Ini menghasilkan ukuran file yang jauh lebih kecil dan waktu unduh yang lebih cepat, menjadikannya langkah optimisasi pertama dan paling kritis.
    *   **Persyaratan**: **Semua file GLB harus diproses dengan kompresi Draco**.
    *   **Alat yang Direkomendasikan7, 31].
        *   Tekstur yang lebih besar (maksimal **2048x2048**) dapat digunakan untuk *hero assets* di desktop, tetapi harus dimuat secara kondisional.
        *   Dimensi tekstur harus merupakan **pangkat dua** (*power of two*) untuk kinerja GPU yang optimal.
    *   **Kompresi Tingkat Lanjut**: Semua tekstur harus dikonversi ke format yang dioptimalkan untuk GPU seperti **KTX2 dengan kompresi Basis Universal**. Ini memungkinkan tekstur tetap terkompresi dalam memori GPU, mengurangi jejak memori, dan meningkatkan kinerja *rendering*.
    *   **Alat yang Direkomendasikan**: Photoshop, `gltf.report`, `gltf-transform`.
*   **Penyederhanaan dan Desimasi *Mesh***:
    *   **Tujuan**: Model *high-poly* yang dihasilkan dari fotogrametri tidak cocok untuk *rendering real-time* dan harus diretopologi menjadi versi *low-poly*.
    *   **Target**: Jumlah poligon untuk setiap objek interaktif tunggal **tidak boleh melebihi 50.000 segitiga**.
    *   **Alat yang Direkomendasikan**: Modifier "Decimate" di Blender, atau perangkat lunak khusus seperti InstaLOD.

#### **3. Praktik Pemodelan Berbasis Kinerja**
Selain optimisasi teknis, praktik pemodelan yang baik sangat penting untuk kinerja.

*   **Implementasi Level of Detail (LOD)**:
    *   **Persyaratan**: LOD bukan merupakan peningkatan opsional, melainkan **persyaratan inti untuk kinerja yang dapat diskalakan**.
    *   **Target**: Untuk aset yang kompleks, setidaknya **tiga versi** harus dibuat: *high-poly* (untuk tampilan dekat), *medium-poly*, dan *low-poly* (untuk tampilan jauh).
    *   **Alat yang Direkomendasikan**: Blender, kelas `LOD` Three.js.
*   **Pengurangan *Draw Call***:
    *   **Tujuan**: Setiap objek dalam adegan biasanya memerlukan setidaknya satu *draw call* ke GPU, dan jumlah *draw call* yang tinggi adalah hambatan kinerja utama.
    *   **Strategi**:
        *   **Penggabungan Geometri**: Objek statis yang berbagi material yang sama harus digabungkan menjadi satu geometri tunggal untuk di-*render* dalam satu *draw call*.
        *   ***Instanced Rendering***: Untuk objek yang muncul berkali-kali dalam adegan (misalnya, biji kopi, pohon), `InstancedMesh` akan digunakan untuk me-*render* semua *instance* dalam satu *draw call* tunggal.
    *   **Alat yang Direkomendasikan**: Blender, kode Three.js.

#### **4. Otomatisasi dan Mitigasi Risiko**
Investasi besar dalam **mengotomatisasi seluruh alur kerja optimisasi aset 3D sejak awal sangat penting**. Alat seperti `gltf-transform` dapat diintegrasikan ke dalam skrip yang dapat dijalankan oleh seniman atau dipicu secara otomatis saat pengiriman aset.

Peta jalan pengembangan memprioritaskan "Membangun dan mengotomatisasi seluruh alur optimisasi aset 3D" pada **Fase 1** sebagai langkah *de-risking* kritis sebelum pengembangan fitur signifikan dimulai. Hal ini memastikan semua pengembangan fitur selanjutnya terjadi dalam kerangka kerja yang sadar kinerja, mencegah pengerjaan ulang yang mahal di kemudian hari.

Tabel berikut meringkas daftar periksa optimisasi aset 3D sebagai **gerbang kualitas yang definitif dan tidak dapat ditawar**:

| Langkah Optimisasi        | Metrik / Target                               | Alat yang Direkomendasikan                    |
| :------------------------ | :-------------------------------------------- | :-------------------------------------------- |
| **Format File**           | GLB (glTF 2.0 Binary)                         | Blender, Maya2glTF, gltf.report               |
| **Jumlah Poligon**        | < 50.000 segitiga per objek interaktif        | Blender (Decimate Modifier), InstaLOD         |
| **Kompresi Geometri**     | Kompresi Draco (Wajib)                        | gltf-transform, gltf-pipeline                 |
| **Resolusi Tekstur**      | Maks 1024x1024 (Seluler), 2048x2048 (Desktop) | Photoshop, gltf.report                        |
| **Kompresi Tekstur**      | KTX2 / Basis Universal                        | gltf-transform                                |
| ***Draw Calls***          | Gabungkan *mesh* statis, Gunakan `InstancedMesh` untuk duplikat | Blender, kode Three.js                        |
| **Level of Detail (LOD)** | Minimal 3 level untuk aset kompleks           | Blender, kelas `LOD` Three.js                 |

Panduan ini bertujuan untuk memastikan bahwa setiap aset 3D yang masuk ke platform KopiKala memenuhi standar kinerja tinggi, sehingga dapat menerjemahkan pengalaman aplikasi seluler asli yang imersif ke lingkungan peramban web yang lebih menantang.