# **Cetak Biru Teknis: Menerjemahkan Pengalaman Seluler Imersif KopiKala ke Aplikasi Web Berkinerja Tinggi**

## **I. Arsitektur Fundamental: Tumpukan Platform Web KopiKala**

Bagian ini menetapkan pilar-pilar teknologi inti dari platform. Pilihan-pilihan yang dibuat di sini saling bergantung dan membentuk landasan dari seluruh pengalaman pengguna, yang memengaruhi kinerja, skalabilitas, dan produktivitas pengembang.

### **1.1. Ekosistem Vue 3 dan TresJS: Paradigma Deklaratif untuk Web 3D**

Dasar dari arsitektur frontend platform ini bergantung pada pilihan kerangka kerja JavaScript yang modern dan ekosistem yang dirancang khusus untuk menjembatani kesenjangan antara pengembangan web tradisional dan rendering grafis 3D real-time.

#### **Rasionalisasi untuk Vue 3**

Vue 3 dipilih sebagai kerangka kerja JavaScript fundamental. Composition API 1 dan sintaks

\<script setup\> 3 yang diperkenalkannya menyediakan model yang superior untuk mengorganisasi logika yang kompleks dan stateful, yang merupakan sifat bawaan dari aplikasi 3D. Pendekatan ini menjauh dari logika yang tersebar pada Options API dan memungkinkan penggunaan kembali kode yang lebih baik serta inferensi tipe yang lebih kuat saat digunakan dengan TypeScript.1 Selain itu, kode yang ditulis dengan Composition API lebih ramah terhadap proses minifikasi, menghasilkan ukuran bundel produksi yang lebih kecil dan overhead yang lebih sedikit.1 Ini adalah faktor kritis untuk kinerja web, di mana setiap kilobyte berarti untuk waktu muat awal.

#### **Menjembatani Kesenjangan Deklaratif/Imperatif dengan TresJS**

Tantangan fundamental dalam pengembangan web 3D adalah "ketidakcocokan impedansi" antara kerangka kerja UI deklaratif seperti Vue dan pustaka 3D imperatif seperti Three.js.4 Kode Three.js vanilla seringkali bersifat object-oriented dan prosedural (misalnya,

scene.add(mesh)), yang bertentangan dengan sifat reaktif dan berbasis komponen dari Vue. Mengintegrasikan keduanya secara naif sering kali menghasilkan kode yang sulit dipelihara dan tidak dapat diskalakan.5

TresJS, sebuah perender kustom Vue untuk Three.js yang terinspirasi oleh React Three Fiber 5, memecahkan masalah ini dengan elegan. Ini memungkinkan pengembang untuk membangun adegan 3D secara deklaratif menggunakan komponen Vue (misalnya,

\<TresMesh\>, \<TresPerspectiveCamera\>).7 Pergeseran paradigma ini adalah keputusan arsitektural tunggal yang paling penting untuk frontend. Ini mengubah cara pengembangan 3D dilakukan, dari skrip monolitik menjadi komposisi komponen yang dapat digunakan kembali dan digerakkan oleh state, persis seperti sisa aplikasi web modern.4 Dengan demikian, pengembang frontend dapat memanfaatkan keahlian mereka yang ada dalam desain komponen, manajemen state, dan

*lifecycle hooks* untuk membangun pengalaman 3D, secara drastis menurunkan hambatan masuk dan meningkatkan kecepatan pengembangan. Implikasi yang lebih luas adalah bahwa platform KopiKala akan lebih mudah dipelihara, diskalakan, dan lebih mudah untuk dikelola oleh tim pengembang dibandingkan dengan proyek yang dibangun di atas fondasi Three.js vanilla.

#### **Konsep Inti TresJS**

Implementasi akan berpusat di sekitar komponen \<TresCanvas\>, yang secara otomatis mengatur WebGLRenderer dan *render loop* inti, mengabstraksi banyak kode boilerplate yang diperlukan dalam pengaturan Three.js vanilla.7 Semua objek Three.js tersedia sebagai komponen Vue yang dihasilkan secara otomatis dengan awalan

Tres (misalnya, THREE.BoxGeometry menjadi \<TresBoxGeometry\>), menghilangkan kebutuhan untuk impor dan instansiasi manual.8 Argumen konstruktor diteruskan melalui prop

args, dan properti objek diikat langsung sebagai prop Vue yang reaktif.7 Model ini sangat menyederhanakan proses pembuatan dan manipulasi adegan 3D.

#### **Ekosistem dan Komunitas**

TresJS bukan hanya sebuah perender; ini adalah ekosistem yang berkembang dengan ekstensi seperti cientos untuk menyediakan *helper* dan kontrol siap pakai (misalnya, OrbitControls, Stats) dan dukungan komunitas yang kuat, termasuk dukungan dari para pencipta Vue dan Nuxt.9 Hal ini memastikan bahwa platform KopiKala dibangun di atas fondasi yang didukung dengan baik dan siap untuk masa depan.

### **1.2. Backend Berkonkurensi Tinggi dengan Go (Golang)**

Untuk mendukung pengalaman 3D yang dinamis dan real-time, arsitektur backend harus dirancang untuk kinerja dan konkurensi.

#### **Mengapa Go untuk Layanan Real-Time**

Backend harus menangani ribuan koneksi pengguna secara bersamaan untuk pembaruan real-time. Dukungan bawaan Go untuk konkurensi melalui *goroutine* dan *channel* membuatnya sangat cocok untuk tugas ini, jauh lebih efisien daripada *runtime single-threaded* seperti Node.js untuk operasi yang terikat CPU atau I/O tinggi.14 Sifatnya yang dikompilasi dan manajemen memori yang efisien memastikan respons dengan latensi rendah, yang sangat penting untuk mempertahankan ilusi dunia 3D yang hidup dan interaktif.

#### **Pola Arsitektur**

Backend akan menggunakan pendekatan berorientasi layanan mikro (*microservices*).16 Layanan-layanan yang berbeda akan didefinisikan untuk:

1. **Layanan API REST:** Untuk pemuatan data awal (profil pengguna, katalog produk, konfigurasi adegan). Ini mengikuti model permintaan-respons standar.17  
2. **Layanan Real-Time:** Layanan khusus yang mengelola koneksi WebSocket yang persisten untuk menyiarkan perubahan state, interaksi pengguna, dan data dinamis lainnya.14  
3. **Layanan Pengiriman Aset:** Layanan yang dioptimalkan untuk menyajikan aset 3D statis, yang idealnya terintegrasi dengan Jaringan Pengiriman Konten (CDN) untuk distribusi global yang cepat.

#### **Protokol Komunikasi**

Komunikasi utama akan menjadi model hibrida. Pemuatan halaman awal akan menggunakan API RESTful untuk mengambil state dasar adegan. Setelah frontend diinisialisasi, ia akan membuat koneksi WebSocket ke Layanan Real-Time untuk semua pembaruan dinamis berikutnya. Ini memastikan komunikasi dua arah dengan latensi rendah yang diperlukan untuk interaktivitas.14

### **1.3. Manajemen State Terpusat dengan Pinia**

Dalam aplikasi yang kompleks di mana kontrol UI (misalnya, pemilih warna 2D) harus memengaruhi objek di dalam kanvas 3D, meneruskan properti melalui beberapa lapisan komponen (*prop drilling*) menjadi tidak dapat dikelola.18 Solusi manajemen state terpusat sangat penting.

#### **Kebutuhan akan *Global Store***

Pinia adalah pustaka manajemen state resmi yang direkomendasikan untuk Vue 3, menawarkan API yang lebih sederhana, lebih intuitif, dan sepenuhnya aman-tipe (*type-safe*) dibandingkan dengan pendahulunya, Vuex.19

#### **Arsitektur *Store* Pinia**

State aplikasi akan distrukturkan ke dalam *store* berbasis fitur yang logis (misalnya, useSceneStore, useProductStore, useUserStore).20 Desain modular ini secara inheren dapat diskalakan.19 Sebuah

*store* tipikal akan mendefinisikan state (data reaktif), getters (properti terkomputasi), dan actions (metode untuk mengubah state).18

#### **Menghubungkan Pinia ke TresJS**

State di dalam *store* Pinia akan berfungsi sebagai satu-satunya sumber kebenaran (*single source of truth*). Komponen Vue, termasuk komponen 3D TresJS, akan berlangganan state ini. Misalnya, prop color dari \<TresMeshStandardMaterial\> dapat langsung diikat ke properti state di useProductStore. Ketika sebuah *action* di *store* memperbarui warna ini (misalnya, productStore.setSelectedColor('red')), sistem reaktivitas Vue akan secara otomatis menyebarkan perubahan ini ke material, memperbarui penampilan objek 3D secara real-time tanpa intervensi manual. Ini menciptakan *loop* reaktif yang kuat antara UI 2D, state global, dan adegan 3D.23

Kombinasi holistik dari kerangka kerja frontend yang sangat dioptimalkan, backend real-time berkinerja tinggi, dan manajer state yang ringan ini secara kolektif menciptakan fondasi arsitektur di mana kinerja adalah prinsip desain utama, bukan renungan. Pendekatan ini diperlukan untuk menerjemahkan pengalaman aplikasi seluler asli, yang memiliki lebih sedikit kendala kinerja, ke lingkungan peramban web yang lebih menantang.25

## **II. Alur Produksi Aset 3D: Dari Pembuatan hingga Penerapan**

Bagian ini menguraikan proses ujung-ke-ujung yang tidak dapat ditawar untuk semua aset 3D. Sebuah aset yang dioptimalkan dengan buruk dapat sendirian merusak pengalaman pengguna, terlepas dari seberapa baik arsitektur aplikasinya. Alur kerja ini harus diotomatisasi dan ditegakkan sebagai gerbang kualitas yang ketat.

### **2.1. Akuisisi dan Standardisasi Aset**

Langkah pertama dalam alur kerja adalah memastikan bahwa semua aset dibuat dan diformat secara konsisten untuk web.

#### **Alur Kerja untuk Pembuatan Aset**

Alur kerja standar untuk pembuatan aset akan ditetapkan, merekomendasikan fotogrametri (*Structure-from-Motion*) untuk objek realistis.26 Proses ini melibatkan pengambilan beberapa foto objek dari berbagai sudut dan menggunakan perangkat lunak untuk merekonstruksi model 3D

*high-poly*.29

#### **Format Pengiriman Standar: GLB**

Semua aset akhir yang siap untuk web harus dikirimkan dalam format GLB (glTF 2.0 Binary). GLB adalah standar industri untuk web 3D, yang menggabungkan geometri, material, dan tekstur ke dalam satu file biner yang ringkas. Format ini dioptimalkan untuk pengiriman web dan pemuatan yang dipercepat oleh GPU, menjadikannya pilihan yang paling efisien.31

### **2.2. Optimisasi Wajib: Inti dari Kinerja Web**

Optimisasi bukanlah langkah opsional; ini adalah bagian integral dari alur produksi aset. Setiap aset harus melalui serangkaian langkah optimisasi yang ketat sebelum dianggap siap produksi. Alur kerja ini harus dilihat sebagai kontrak organisasi antara tim desain dan rekayasa. Tim seniman 3D bertanggung jawab untuk jumlah poligon dan pembuatan LOD, sementara pengembang bertanggung jawab untuk mengimplementasikan *loader* dan logika *instancing*. Alat optimisasi otomatis berada di tengah, memastikan bahwa hanya aset yang memenuhi kriteria yang mencapai produksi. Ini mencegah skenario umum di mana aset "final dari seniman" yang tidak dioptimalkan diserahkan ke rekayasa, menyebabkan krisis kinerja di akhir siklus pengembangan.

#### **Kompresi Geometri dengan Draco**

Semua file GLB harus diproses dengan kompresi Draco. Draco adalah pustaka dari Google yang secara signifikan mengurangi ukuran data geometri 3D (posisi, normal, dll.).33 Ini menghasilkan ukuran file yang jauh lebih kecil dan waktu unduh yang lebih cepat, yang merupakan langkah optimisasi pertama dan paling kritis.35 Frontend akan menggunakan instance

DRACOLoader, yang dikonfigurasi di dalam GLTFLoader, untuk mendekompresi geometri ini di sisi klien.37 Pilihan untuk menggunakan Draco secara fundamental menentukan pengalaman pemuatan frontend. Ini menciptakan pertukaran langsung: unduhan lebih cepat versus biaya CPU pada perangkat pengguna untuk dekompresi. Implikasi ini memaksa serangkaian keputusan arsitektural di frontend.

DRACOLoader memerlukan pustaka *decoder* WASM dan JS, yang harus di-hosting dan jalurnya dikonfigurasi dengan benar.37 Karena dekompresi dapat memblokir

*main thread*, itu harus dilakukan secara asinkron, kemungkinan besar di dalam batas \<Suspense\> di Vue, yang dikelola oleh *composable* seperti useGLTF dari pustaka cientos.9 UI harus menampilkan state pemuatan yang bermakna selama fase dekompresi ini untuk menghindari pembekuan UI.

#### **Optimisasi dan Kompresi Tekstur**

Tekstur sering kali menjadi kontributor terbesar terhadap ukuran file.31 Kebijakan yang ketat harus ditegakkan:

1. **Batas Resolusi:** Tekstur tidak boleh melebihi resolusi 1024x1024 untuk pengalaman yang mengutamakan seluler. Tekstur yang lebih besar (maksimal 2048x2048) dapat digunakan untuk aset pahlawan (*hero assets*) di desktop tetapi harus dimuat secara kondisional.31 Dimensi harus merupakan pangkat dua (  
   *power of two*) untuk kinerja GPU yang optimal.41  
2. **Kompresi Tingkat Lanjut:** Semua tekstur harus dikonversi ke format yang dioptimalkan untuk GPU seperti KTX2 dengan kompresi Basis Universal. Ini memungkinkan tekstur tetap terkompresi dalam memori GPU, mengurangi jejak memori dan meningkatkan kinerja rendering. Alat seperti gltf-transform akan diintegrasikan ke dalam alur produksi aset untuk mengotomatisasi proses ini.42

#### **Penyederhanaan dan Desimasi Mesh**

Model *high-poly* yang dihasilkan dari fotogrametri tidak cocok untuk rendering real-time. Model tersebut harus diretopologi menjadi versi *low-poly*. Jumlah poligon untuk setiap objek interaktif tunggal tidak boleh melebihi 50.000 segitiga.40 Alat seperti modifier "Decimate" di Blender atau perangkat lunak khusus seperti InstaLOD akan digunakan untuk mengurangi kompleksitas mesh sambil mempertahankan ketepatan visual.26

### **2.3. Praktik Pemodelan Berbasis Kinerja**

Selain optimisasi teknis, praktik pemodelan yang baik sangat penting untuk kinerja.

#### **Implementasi Level of Detail (LOD)**

LOD bukan merupakan peningkatan opsional; ini adalah persyaratan inti untuk kinerja yang dapat diskalakan. Untuk aset yang kompleks, setidaknya tiga versi harus dibuat: *high-poly* (untuk tampilan dekat), *medium-poly*, dan *low-poly* (untuk tampilan jauh).43 Three.js menyediakan objek

LOD yang secara otomatis beralih di antara model-model ini berdasarkan jaraknya dari kamera, memastikan bahwa GPU hanya me-render tingkat detail yang diperlukan.44

#### **Pengurangan *Draw Call***

Setiap objek dalam adegan biasanya memerlukan setidaknya satu "*draw call*" ke GPU. Jumlah *draw call* yang tinggi adalah hambatan kinerja utama.41 Untuk mengatasinya, akan ditegakkan hal-hal berikut:

1. **Penggabungan Geometri:** Objek statis yang berbagi material yang sama akan digabungkan menjadi satu geometri tunggal untuk di-render dalam satu *draw call*.41  
2. ***Instanced Rendering*****:** Untuk objek yang muncul berkali-kali dalam adegan (misalnya, biji kopi, pohon), InstancedMesh akan digunakan untuk me-render semua instance dalam satu *draw call* tunggal.41

### **Tabel 1: Daftar Periksa Optimisasi Aset 3D**

Tabel ini berfungsi sebagai gerbang kualitas yang definitif dan tidak dapat ditawar untuk setiap aset 3D yang masuk ke platform KopiKala. Ini memberikan target yang jelas dan terukur bagi para seniman 3D dan pengembang, memastikan bahwa kinerja dibangun ke dalam alur produksi aset sejak awal.

| Langkah Optimisasi | Metrik / Target | Alat yang Direkomendasikan | Referensi |
| :---- | :---- | :---- | :---- |
| **Format File** | GLB (glTF 2.0 Binary) | Blender, Maya2glTF, gltf.report | 31 |
| **Jumlah Poligon** | \< 50.000 segitiga per objek interaktif | Blender (Decimate Modifier), InstaLOD | 31 |
| **Kompresi Geometri** | Kompresi Draco (Wajib) | gltf-transform, gltf-pipeline | 33 |
| **Resolusi Tekstur** | Maks 1024x1024 (Seluler), 2048x2048 (Desktop) | Photoshop, gltf.report | 31 |
| **Kompresi Tekstur** | KTX2 / Basis Universal | gltf-transform | 42 |
| ***Draw Calls*** | Gabungkan mesh statis, Gunakan InstancedMesh untuk duplikat | Blender, kode Three.js | 41 |
| **Level of Detail (LOD)** | Minimal 3 level untuk aset kompleks | Blender, kelas LOD Three.js | 43 |

## **III. Implementasi Frontend: Merancang Pengalaman Imersif**

Bagian ini merinci aplikasi praktis dari tumpukan teknologi yang dipilih untuk membangun frontend yang interaktif dan kaya secara visual, menerjemahkan UX seluler ke web.

### **3.1. Konstruksi Adegan Deklaratif dengan TresJS**

Pendekatan deklaratif TresJS akan menjadi inti dari bagaimana adegan 3D dibangun dan dikelola.

#### ***Scene Graph*** **Berbasis Komponen**

Seluruh adegan 3D akan dibangun sebagai pohon komponen Vue di dalam tag \<TresCanvas\>. Ini mencerminkan pohon DOM, membuat strukturnya intuitif bagi pengembang web.8 Misalnya, model cangkir kopi akan menjadi komponen

\<TresMesh\> yang berisi \<TresTorusGeometry\> dan \<TresMeshStandardMaterial\> sebagai turunannya.8

#### **Pencahayaan dan Lingkungan**

Pencahayaan yang realistis sangat penting untuk imersi. Kombinasi dari TresAmbientLight untuk iluminasi global, TresDirectionalLight untuk efek sinar matahari (dengan bayangan diaktifkan pada TresCanvas dan mesh individual), dan peta lingkungan yang dimuat melalui useTexture untuk refleksi *physically-based rendering* (PBR) pada material seperti TresMeshStandardMaterial akan digunakan.41

#### **Memuat Model yang Dioptimalkan**

Model GLB yang dioptimalkan dari alur produksi akan dimuat menggunakan *composable* useGLTF dari @tresjs/cientos. *Composable* ini membungkus GLTFLoader dan DRACOLoader, menangani proses pemuatan dan dekompresi asinkron secara mulus. Ini dirancang untuk bekerja dengan komponen \<Suspense\> Vue, yang menyederhanakan pengelolaan state pemuatan.9

### **3.2. Lingkungan 3D Reaktif: Pengalaman Berbasis State**

Kekuatan inti dari pendekatan TresJS adalah kemampuannya untuk mengikat state reaktif Vue langsung ke properti objek Three.js.

#### **Mengikat State ke Properti 3D**

Fitur ini akan digunakan secara ekstensif. Misalnya, warna produk, yang dikelola di *store* Pinia (productStore.activeColor), dapat diikat ke prop color material: \<TresMeshStandardMaterial :color="productStore.activeColor" /\>. Ketika pengguna berinteraksi dengan contoh warna UI 2D yang memanggil *action* Pinia untuk memperbarui activeColor, warna model 3D akan berubah secara instan dan otomatis.7

#### **Animasi Kustom dengan useLoop**

Untuk animasi berkelanjutan (misalnya, produk yang berputar perlahan, uap yang naik dari cangkir kopi), *composable* useLoop dari TresJS akan digunakan. Ini menyediakan akses ke *hook* onBeforeRender, yang merupakan *loop* berbasis requestAnimationFrame yang efisien. Di dalam *hook* ini, properti objek seperti rotasi atau posisi dapat diperbarui berdasarkan delta (waktu sejak frame terakhir), memastikan animasi yang mulus dan tidak bergantung pada frame rate.7

Cuplikan kode

\<script setup\>  
import { ref } from 'vue';  
import { useLoop } from '@tresjs/core';

const coffeeCupRef \= ref();

const { onBeforeRender } \= useLoop();

onBeforeRender(({ delta }) \=\> {  
  if (coffeeCupRef.value) {  
    // Memutar cangkir kopi secara perlahan  
    coffeeCupRef.value.rotation.y \+= delta \* 0.5;  
  }  
});  
\</script\>

\<template\>  
  \<TresMesh ref="coffeeCupRef"... /\>  
\</template\>

### **3.3. Mengatur Animasi Tingkat Lanjut dengan GSAP**

Meskipun useLoop ideal untuk animasi berkelanjutan, GreenSock Animation Platform (GSAP) adalah alat pilihan untuk animasi yang kompleks, berbasis *timeline*, dan interaktif.49 Kombinasi reaktivitas TresJS dan kontrol

*timeline* GSAP menciptakan sistem animasi dua tingkat untuk kinerja maksimum dan fleksibilitas kreatif. useLoop sangat cocok untuk animasi *stateful* dan berkelanjutan yang merupakan bagian dari perilaku ambien adegan. Ini sangat efisien karena terikat langsung dengan requestAnimationFrame perender. GSAP, di sisi lain, unggul dalam urutan yang digerakkan oleh peristiwa dan terkoreografi (misalnya, animasi multi-tahap yang kompleks yang dipicu oleh klik pengguna). Dengan menciptakan sistem dua tingkat ini, animasi sederhana dan berulang dapat dialihkan ke *render loop* yang sangat dioptimalkan, sementara GSAP yang lebih kuat dicadangkan untuk momen-momen berdampak tinggi yang diprakarsai oleh pengguna.

#### **Menganimasikan Objek Three.js**

GSAP dapat secara langsung melakukan *tweening* pada properti objek JavaScript apa pun, termasuk objek Three.js seperti kamera, lampu, dan mesh. Misalnya, untuk memindahkan kamera dengan mulus untuk fokus pada produk tertentu saat diklik, gsap.to() dapat digunakan:

JavaScript

import { gsap } from 'gsap';

// Asumsikan 'camera' adalah objek kamera Three.js dan 'targetPosition' adalah THREE.Vector3  
gsap.to(camera.position, {  
  duration: 1.5,  
  x: targetPosition.x,  
  y: targetPosition.y,  
  z: targetPosition.z,  
  ease: 'power2.inOut'  
});

#### **Transisi Elemen Bersama dengan GSAP Flip**

Untuk menciptakan UX yang benar-benar mulus dan premium yang menjembatani UI 2D dan adegan 3D, transisi "elemen bersama" akan diimplementasikan menggunakan plugin GSAP Flip.53 Ketika pengguna mengklik gambar mini produk 2D, Flip akan digunakan untuk:

1. **First:** Mendapatkan state (posisi, ukuran) dari gambar mini 2D.  
2. **Last:** Membuat model 3D terlihat di adegan pada posisi dan skala akhirnya, dan menyembunyikan gambar mini 2D.  
3. **Invert & Play:** Flip menganimasikan model 3D dari posisi dan skala gambar mini 2D asli ke state akhirnya di adegan 3D. Ini menciptakan ilusi magis bahwa gambar 2D berubah menjadi objek 3D.53

Teknik ini jauh lebih unggul daripada transisi *fade-in/fade-out* sederhana untuk menciptakan nuansa imersif. Transisi dari tag \<img\> statis ke \<TresMesh\> yang sepenuhnya interaktif adalah pola UX yang kuat yang mengangkat pengalaman melampaui situs web biasa. Ini adalah "momen ajaib" penting yang secara langsung menerjemahkan nuansa fidelitas tinggi dari aplikasi asli ke web, yang merupakan inti dari persyaratan pengguna.

### **3.4. Memastikan Fidelitas dan Responsivitas Lintas Perangkat**

Pengalaman harus mulus di semua ukuran layar, dari ponsel hingga monitor desktop besar.

#### **Kanvas Responsif**

\<TresCanvas\> akan dikonfigurasi untuk mengisi wadah induknya, dan CSS standar akan digunakan untuk memastikan wadah tersebut responsif.8

ResizeObserver atau *event listener* resize jendela akan digunakan untuk memperbarui ukuran perender dan rasio aspek kamera setiap kali viewport berubah. Ini adalah persyaratan fundamental untuk mencegah distorsi.57

JavaScript

// Dalam composable atau komponen Vue  
window.addEventListener('resize', () \=\> {  
  // Asumsikan 'renderer' dan 'camera' dapat diakses  
  renderer.setSize(window.innerWidth, window.innerHeight);  
  camera.aspect \= window.innerWidth / window.innerHeight;  
  camera.updateProjectionMatrix();  
});

#### **Strategi Kamera yang Mengutamakan Seluler**

Layar seluler memiliki rasio aspek vertikal, sedangkan desktop horizontal. *Field of View* (FOV) vertikal yang tetap dapat menyebabkan objek tampak terlalu kecil di layar lebar atau sisi-sisinya terpotong di layar tinggi.61 Strategi penyesuaian FOV dinamis akan diimplementasikan untuk memastikan materi subjek utama mempertahankan ukuran yang dirasakan konsisten di semua rasio aspek, menciptakan efek "contain" daripada "cover".61

#### **Kontrol Sentuh yang Intuitif**

Untuk pengguna web seluler, kontrol sentuh yang intuitif tidak dapat ditawar. *Helper* OrbitControls (tersedia di @tresjs/cientos) akan digunakan untuk menyediakan gerakan sentuh standar: seret satu jari untuk mengorbit, cubit dua jari untuk memperbesar, dan seret dua jari untuk menggeser.64 Perhatian harus diberikan untuk memastikan kontrol tidak membajak pengguliran halaman ketika kanvas 3D adalah bagian dari halaman yang dapat digulir lebih besar.66

## **IV. Layanan Backend untuk Dunia yang Dinamis**

Bagian ini merinci arsitektur sisi server yang diperlukan untuk mendukung aplikasi web 3D yang dinamis, interaktif, dan dapat diskalakan.

### **4.1. Desain API dan Komunikasi Real-Time**

Desain API hibrida (REST \+ WebSocket) adalah pilihan arsitektural yang disengaja untuk mengoptimalkan dua pola akses data yang berbeda: pemuatan awal dan interaksi berkelanjutan. Muatan data adegan dan produk awal yang besar paling baik ditangani oleh titik akhir REST yang dapat di-cache dan stateless. Ini adalah pola yang dipahami dengan baik dan sangat dapat dioptimalkan. Pembaruan berikutnya yang kecil, sering, dan berlatensi rendah adalah kasus penggunaan yang sempurna untuk WebSocket. Arsitektur hibrida ini memastikan bahwa pemuatan halaman awal secepat mungkin sambil memastikan pengalaman interaktif se-responsif mungkin.

#### **API REST untuk State Awal**

API RESTful standar, yang dibangun di Go, akan melayani data statis awal yang diperlukan untuk memulai aplikasi. Ini termasuk katalog produk, otentikasi pengguna, dan konfigurasi adegan awal. Ini efisien untuk pengambilan data satu kali.17

#### **Lapisan WebSocket untuk State Dinamis**

Inti dari pengalaman interaktif akan didukung oleh WebSocket. Backend Go akan mengelola koneksi persisten dengan setiap klien. Lapisan ini akan bertanggung jawab untuk:

* Menyiarkan pembaruan real-time (misalnya, perubahan harga, tingkat stok).  
* Menyinkronkan state antara pengguna dalam pengalaman bersama.  
* Menangani interaksi pengguna yang memerlukan validasi atau pemrosesan sisi server (misalnya, melakukan pemesanan).

Pendekatan ini jauh lebih efisien daripada *long-polling* atau *Server-Sent Events* untuk komunikasi dua arah yang sesungguhnya.14

### **4.2. Arsitektur untuk Skalabilitas dan Latensi Rendah**

Platform harus dirancang untuk menangani pertumbuhan di masa depan.

#### **Layanan Go yang Dapat Diskalakan Secara Horizontal**

Layanan Go akan dirancang agar *stateless* dan dikemas dalam kontainer (misalnya, menggunakan Docker). Ini memungkinkan untuk menjalankan beberapa instance dari setiap layanan di belakang *load balancer*, memungkinkan penskalaan horizontal untuk menangani peningkatan lalu lintas tanpa penurunan kinerja.16

#### **Redis untuk Caching dan Pub/Sub**

Untuk lebih meningkatkan kinerja dan mengurangi beban basis data, Redis akan diintegrasikan. Perannya akan ada dua:

1. **Lapisan Caching:** Menyimpan data yang sering diakses seperti detail produk atau informasi sesi pengguna di dalam memori untuk pengambilan yang hampir instan.14  
2. **Broker Pub/Sub:** Dalam backend dengan banyak instance, pesan WebSocket mungkin tiba di satu instance server tetapi perlu disiarkan ke klien yang terhubung ke instance lain. Redis Pub/Sub akan bertindak sebagai bus pesan berkecepatan tinggi antara instance layanan Go, memastikan semua klien menerima pembaruan real-time terlepas dari server mana mereka terhubung.14

Penggunaan Redis Pub/Sub adalah kunci yang membuka skalabilitas horizontal sejati untuk komponen real-time, mengubahnya dari solusi server tunggal menjadi platform tingkat perusahaan. Ini memisahkan server aplikasi Go, memungkinkan mereka untuk tetap *stateless* sambil menyediakan tulang punggung komunikasi bersama. Tanpa ini, platform akan terbatas pada penskalaan vertikal (server yang lebih besar), yang mahal dan memiliki batas keras. Dengan Pub/Sub, platform dapat diskalakan secara horizontal (lebih banyak server), yang hemat biaya dan hampir tidak terbatas, menjadikannya siap untuk pertumbuhan KopiKala di masa depan.

## **V. Strategi Jaminan Kualitas dan Kinerja yang Komprehensif**

Bagian ini mendefinisikan strategi pengujian dan pemantauan berlapis yang secara khusus disesuaikan dengan tantangan unik aplikasi WebGL 3D. Praktik QA standar tidak cukup untuk menjamin ketepatan visual dan kinerja yang diperlukan untuk pengalaman imersif.

### **5.1. Penganggaran Kinerja dan Pemantauan Berkelanjutan**

Kinerja harus diukur dan dikelola secara proaktif selama siklus hidup pengembangan.

#### **Menetapkan KPI Kinerja**

Anggaran kinerja yang ketat akan ditentukan sebelum pengembangan dimulai. Metrik utama yang harus dipantau meliputi:

* **Frame Per Detik (FPS):** Menargetkan 60 FPS yang konsisten.  
* ***Draw Calls*****:** Menjaga di bawah 200 per frame jika memungkinkan.  
* ***Total Blocking Time*** **(TBT) & *Largest Contentful Paint* (LCP):** Core Web Vitals tetap relevan.  
* **Waktu Muat Aset:** Waktu untuk mengunduh dan mendekode model 3D.

#### **Pemantauan Real-Time dengan stats.js**

Selama pengembangan, pustaka stats.js akan diintegrasikan (melalui komponen \<Stats /\> di cientos) untuk menyediakan tampilan di layar dari FPS, penggunaan memori, dan waktu render. Ini memberikan umpan balik langsung kepada pengembang tentang dampak kinerja dari perubahan mereka.41

#### **Audit Otomatis dengan Lighthouse**

Google Lighthouse akan diintegrasikan ke dalam alur kerja CI/CD. Setiap *pull request* akan memicu audit Lighthouse untuk secara otomatis memeriksa regresi dalam kinerja, aksesibilitas, dan praktik terbaik. Ini mencegah penurunan kinerja digabungkan ke cabang utama.72

### **5.2. Pengujian Otomatis untuk WebGL**

Strategi QA yang berhasil untuk WebGL memerlukan perlakuan \<canvas\> bukan sebagai elemen UI tunggal, tetapi sebagai jendela aplikasi utuh yang membutuhkan tumpukan pengujian khususnya sendiri. Kerangka kerja pengujian E2E tradisional buta terhadap apa yang terjadi di dalam kanvas. Oleh karena itu, tumpukan pengujian paralel harus dibangun khusus untuk kanvas: Playwright menangani lapisan *interaksi*, dan Percy/Applitools menangani lapisan *validasi visual*.

#### **Pengujian End-to-End (E2E) dengan Playwright**

Pengujian E2E standar sering kali gagal dengan WebGL karena tidak dapat berinteraksi dengan elemen \<canvas\>. Playwright, yang mampu melakukan otomatisasi peramban yang lebih kuat, akan digunakan.77 Secara krusial,

*runner* CI akan dikonfigurasi dengan dukungan GPU, dan Playwright akan diluncurkan dengan flag untuk mengaktifkan akselerasi perangkat keras (misalnya, \--use-angle=gl). Ini penting untuk menjalankan pengujian di lingkungan *headless* yang secara akurat mencerminkan kinerja dan stabilitas rendering dunia nyata.78 Pengujian akan mensimulasikan interaksi pengguna dan memverifikasi perubahan state yang dihasilkan.

#### **Pengujian Regresi Visual untuk Adegan 3D**

Tantangan QA yang paling signifikan adalah mendeteksi bug visual yang tidak disengaja (misalnya, tekstur tidak dimuat, model tampak terdistorsi). Pengujian fungsional tidak dapat menangkap ini. Alur kerja pengujian regresi visual akan diimplementasikan menggunakan layanan seperti Percy atau Applitools.80 Prosesnya adalah:

1. Pengujian E2E akan menavigasi aplikasi ke state tertentu.  
2. Pada saat-saat penting, animasi akan dijeda secara terprogram.  
3. Tangkapan layar dari elemen \<canvas\> akan diambil dan dikirim ke layanan pengujian visual.  
4. Layanan membandingkan tangkapan layar ini dengan gambar dasar yang disetujui, menyoroti setiap perbedaan tingkat piksel untuk ditinjau oleh manusia. Ini mengotomatiskan proses QA visual manual yang membosankan dan rawan kesalahan.80

Dengan mengintegrasikan pengujian kinerja dan regresi visual ke dalam alur kerja CI/CD, jaminan kualitas diubah dari aktivitas reaktif pasca-pengembangan menjadi disiplin proaktif dan preventif. Sebuah *pull request* yang menyebabkan skor kinerja turun di bawah ambang batas yang ditetapkan atau memperkenalkan perbedaan visual akan secara otomatis gagal dalam pemeriksaannya. Ini menciptakan budaya di mana kinerja dan ketepatan visual diperlakukan sebagai persyaratan kelas satu, sama seperti kebenaran fungsional.

## **VI. Rekomendasi Strategis dan Peta Jalan Implementasi**

Bagian akhir ini memberikan rencana tingkat tinggi untuk eksekusi, mengidentifikasi potensi risiko, dan memposisikan platform KopiKala untuk pertumbuhan di masa depan.

### **6.1. Rencana Pengembangan Bertahap**

Peta jalan yang diusulkan secara eksplisit memprioritaskan pembuatan dan otomatisasi alur kerja aset sebelum pengembangan fitur yang signifikan. Ini adalah langkah de-risking yang kritis, karena memastikan bahwa semua pengembangan fitur selanjutnya terjadi dalam kerangka kerja yang sadar kinerja, mencegah pengerjaan ulang yang mahal di kemudian hari.

* **Fase 1: Fondasi dan Alur Produksi (Bulan 1-2):**  
  * Pengaturan struktur proyek Vue 3 \+ TresJS.  
  * Pengembangan layanan backend Go inti (REST, WebSocket) dan penyebaran infrastruktur.  
  * Membangun dan mengotomatisasi seluruh alur optimisasi aset 3D (Bagian II). Ini harus diselesaikan sebelum pengembangan fitur signifikan dimulai.  
* **Fase 2: Pengalaman Inti (Bulan 3-5):**  
  * Implementasi penampil adegan 3D utama, pemuatan produk, dan interaksi dasar.  
  * Integrasi Pinia untuk manajemen state.  
  * Pengembangan kontrol responsif dan logika kamera yang mengutamakan seluler.  
* **Fase 3: Fitur Lanjutan dan Poles (Bulan 6-7):**  
  * Implementasi animasi dan transisi tingkat lanjut dengan GSAP, termasuk transisi elemen bersama.  
  * Membangun fitur UI yang tersisa.  
  * Melakukan optimisasi kinerja intensif dan perbaikan bug.  
* **Fase 4: QA dan Peluncuran (Bulan 8):**  
  * Implementasi suite pengujian E2E dan regresi visual penuh.  
  * Pengujian penerimaan pengguna (UAT).  
  * Penerapan ke produksi.

### **6.2. Mempersiapkan Platform untuk Masa Depan**

Arsitektur harus dirancang untuk adaptasi dan pertumbuhan. Lapisan abstraksi yang disediakan oleh TresJS dan layanan mikro Go adalah kunci untuk mempersiapkan platform terhadap pergeseran teknologi.

#### **WebGPU**

Meskipun WebGL adalah standar saat ini, WebGPU adalah API grafis generasi berikutnya untuk web, yang menawarkan akses tingkat lebih rendah ke GPU dan potensi peningkatan kinerja yang signifikan.25 Three.js secara aktif mengembangkan perender WebGPU-nya. Arsitektur yang diusulkan di sini, yang mengabstraksi logika rendering di belakang komponen TresJS, diposisikan dengan baik untuk mengadopsi perender WebGPU di masa depan dengan perubahan minimal pada kode tingkat aplikasi. Transisi akan melibatkan perubahan konfigurasi perender di dalam komponen

\<TresCanvas\>, bukan menulis ulang setiap komponen.

#### **Pustaka Komponen**

Pendekatan berbasis komponen 4 memungkinkan pembuatan pustaka komponen 3D yang dapat digunakan kembali (misalnya, penampil produk kustom, hotspot interaktif) yang dapat dengan mudah dibagikan di berbagai pengalaman di platform KopiKala.

### **6.3. Penilaian Risiko dan Mitigasi**

Setiap proyek teknologi yang ambisius memiliki risiko yang melekat. Mengidentifikasi dan merencanakannya sangat penting.

* **Variabilitas Kinerja Seluler:** Kinerja dapat sangat bervariasi di berbagai perangkat seluler karena GPU dan implementasi peramban yang berbeda.  
  * **Mitigasi:** Terapkan secara agresif alur optimisasi aset (Bagian II), terutama LOD. Lakukan pengujian kinerja berkelanjutan pada berbagai perangkat nyata, bukan hanya emulator.  
* **Inkonsistensi API Peramban:** WebGL dan API web terkait dapat memiliki perbedaan halus antara Chrome, Firefox, dan Safari.  
  * **Mitigasi:** Manfaatkan pustaka seperti Three.js yang mengabstraksi banyak dari inkonsistensi ini. Terapkan strategi pengujian lintas peramban yang kuat sebagai bagian dari alur kerja CI/CD menggunakan layanan seperti BrowserStack.  
* **Hambatan Alur Produksi Aset:** Alur produksi aset yang manual atau dikelola dengan buruk dapat menjadi hambatan utama untuk pembaruan konten.  
  * **Mitigasi:** Investasikan secara besar-besaran dalam mengotomatisasi alur kerja sejak awal. Gunakan alat seperti gltf-transform dalam skrip yang dapat dijalankan oleh seniman atau dipicu secara otomatis saat pengiriman aset.

#### **Karya yang dikutip**

1. Composition API FAQ \- Vue.js, diakses September 8, 2025, [https://vuejs.org/guide/extras/composition-api-faq](https://vuejs.org/guide/extras/composition-api-faq)  
2. Vue.js 3 Composition API: A Game Changer for Developers | by Emperor Brains | Medium, diakses September 8, 2025, [https://medium.com/@emperorbrains/vue-js-3-composition-api-a-game-changer-for-developers-c6cd8b703a6f](https://medium.com/@emperorbrains/vue-js-3-composition-api-a-game-changer-for-developers-c6cd8b703a6f)  
3. Vue 3 & Composition API \- Full Project \- YouTube, diakses September 8, 2025, [https://www.youtube.com/watch?v=hNPwdOZ3qFU](https://www.youtube.com/watch?v=hNPwdOZ3qFU)  
4. Integration with Vue 3 : r/threejs \- Reddit, diakses September 8, 2025, [https://www.reddit.com/r/threejs/comments/1i6vdzr/integration\_with\_vue\_3/](https://www.reddit.com/r/threejs/comments/1i6vdzr/integration_with_vue_3/)  
5. Opinion: Should I move to Unity or stay with Three.JS? \- Discussion, diakses September 8, 2025, [https://discourse.threejs.org/t/opinion-should-i-move-to-unity-or-stay-with-three-js/48873](https://discourse.threejs.org/t/opinion-should-i-move-to-unity-or-stay-with-three-js/48873)  
6. Introduction | TresJS, diakses September 8, 2025, [https://docs.tresjs.org/guide/](https://docs.tresjs.org/guide/)  
7. Building a 3D Scene in Nuxt with TresJS | Vue Mastery, diakses September 8, 2025, [https://www.vuemastery.com/blog/building-a-3d-scene-in-nuxt-with-tresjs/](https://www.vuemastery.com/blog/building-a-3d-scene-in-nuxt-with-tresjs/)  
8. Your first scene | TresJS, diakses September 8, 2025, [https://docs.tresjs.org/guide/your-first-scene.html](https://docs.tresjs.org/guide/your-first-scene.html)  
9. TresJS, diakses September 8, 2025, [https://tresjs.org/](https://tresjs.org/)  
10. Build 3D Scenes Declaratively with TresJS using Vue \- Alvaro Saburido, diakses September 8, 2025, [https://alvarosaburido.dev/blog/build-3d-scenes-declaratively-with-tresjs-using-vue/](https://alvarosaburido.dev/blog/build-3d-scenes-declaratively-with-tresjs-using-vue/)  
11. TresCanvas \- TresJS, diakses September 8, 2025, [https://docs.tresjs.org/api/tres-canvas](https://docs.tresjs.org/api/tres-canvas)  
12. Instances | TresJS, diakses September 8, 2025, [https://docs.tresjs.org/api/instances-arguments-and-props](https://docs.tresjs.org/api/instances-arguments-and-props)  
13. TresJS | The solution for 3D on VueJS, diakses September 8, 2025, [https://docs.tresjs.org/](https://docs.tresjs.org/)  
14. Structuring Backend and handling real time data : r/golang \- Reddit, diakses September 8, 2025, [https://www.reddit.com/r/golang/comments/1f392g0/structuring\_backend\_and\_handling\_real\_time\_data/](https://www.reddit.com/r/golang/comments/1f392g0/structuring_backend_and_handling_real_time_data/)  
15. Go Backend Architecture: From Concept to Deployment \[Part 4\] \- YouTube, diakses September 8, 2025, [https://www.youtube.com/watch?v=rAlOcKQ8hWs](https://www.youtube.com/watch?v=rAlOcKQ8hWs)  
16. Application of Backend and Frontend Systems on Go-Baby Application in Bandung City, diakses September 8, 2025, [https://www.researchgate.net/publication/333704702\_Application\_of\_Backend\_and\_Frontend\_Systems\_on\_Go-Baby\_Application\_in\_Bandung\_City](https://www.researchgate.net/publication/333704702_Application_of_Backend_and_Frontend_Systems_on_Go-Baby_Application_in_Bandung_City)  
17. How to Connect Front End and Backend \- GeeksforGeeks, diakses September 8, 2025, [https://www.geeksforgeeks.org/blogs/how-to-connect-front-end-and-backend/](https://www.geeksforgeeks.org/blogs/how-to-connect-front-end-and-backend/)  
18. State management in Vue 3: Why you should try out Pinia \- Tighten Co., diakses September 8, 2025, [https://tighten.com/insights/state-management-in-vue-3-why-you-should-try-out-pinia/](https://tighten.com/insights/state-management-in-vue-3-why-you-should-try-out-pinia/)  
19. Introduction | Pinia \- Vue.js, diakses September 8, 2025, [https://pinia.vuejs.org/introduction.html](https://pinia.vuejs.org/introduction.html)  
20. Pinia: The Intuitive State Management Solution for Vue 3 | by Dipesh Basnet | Medium, diakses September 8, 2025, [https://medium.com/@bdipesh08/pinia-the-intuitive-state-management-solution-for-vue-3-3534209750bd](https://medium.com/@bdipesh08/pinia-the-intuitive-state-management-solution-for-vue-3-3534209750bd)  
21. State Management with Pinia and Vue.js (Composition API) Lifecycle Hooks, diakses September 8, 2025, [https://dev.to/dharamgfx/state-management-with-pinia-and-vuejs-composition-api-lifecycle-hooks-50bh](https://dev.to/dharamgfx/state-management-with-pinia-and-vuejs-composition-api-lifecycle-hooks-50bh)  
22. State Management in Vue 3 with Pinia: The Successor to Vuex \- Djamware, diakses September 8, 2025, [https://www.djamware.com/post/6891823be267fd7a1ffc9d1a/state-management-in-vue-3-with-pinia-the-successor-to-vuex](https://www.djamware.com/post/6891823be267fd7a1ffc9d1a/state-management-in-vue-3-with-pinia-the-successor-to-vuex)  
23. State | Pinia, diakses September 8, 2025, [https://pinia.vuejs.org/core-concepts/state.html](https://pinia.vuejs.org/core-concepts/state.html)  
24. Pinia and Vue 3 first steps, diakses September 8, 2025, [https://escuelavue.es/en/devtips/pinia-vue-3-composition-api](https://escuelavue.es/en/devtips/pinia-vue-3-composition-api)  
25. How does threejs performance compare to native performance on a device like the Quest 3? \- Reddit, diakses September 8, 2025, [https://www.reddit.com/r/threejs/comments/18gl8ho/how\_does\_threejs\_performance\_compare\_to\_native/](https://www.reddit.com/r/threejs/comments/18gl8ho/how_does_threejs_performance_compare_to_native/)  
26. InstaLOD – The leading solution for 3D optimization, workflow automation and CAD to 3D., diakses September 8, 2025, [https://instalod.com/](https://instalod.com/)  
27. 3D Reality Capture Workflows for AEC and Industry40 \- Cintoo, diakses September 8, 2025, [https://cintoo.com/en/blog/3d-reality-capture](https://cintoo.com/en/blog/3d-reality-capture)  
28. An Open-Source Photogrammetry Workflow for Reconstructing 3D Models \- PMC, diakses September 8, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC10350669/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10350669/)  
29. A Photogrammetry-Based Workflow for the Accurate 3D Construction and Visualization of Museums Assets \- MDPI, diakses September 8, 2025, [https://www.mdpi.com/2072-4292/13/3/486](https://www.mdpi.com/2072-4292/13/3/486)  
30. (PDF) A Photogrammetry-Based Workflow for the Accurate 3D Construction and Visualization of Museums Assets \- ResearchGate, diakses September 8, 2025, [https://www.researchgate.net/publication/348914298\_A\_Photogrammetry-Based\_Workflow\_for\_the\_Accurate\_3D\_Construction\_and\_Visualization\_of\_Museums\_Assets](https://www.researchgate.net/publication/348914298_A_Photogrammetry-Based_Workflow_for_the_Accurate_3D_Construction_and_Visualization_of_Museums_Assets)  
31. Your 3D Models on the Web \- 8th Wall, diakses September 8, 2025, [https://8thwall.com/docs/legacy/guides/your-3d-models-on-the-web/](https://8thwall.com/docs/legacy/guides/your-3d-models-on-the-web/)  
32. The Different Types of 3D File Formats \- Adobe, diakses September 8, 2025, [https://www.adobe.com/products/substance3d/discover/3d-files-formats.html](https://www.adobe.com/products/substance3d/discover/3d-files-formats.html)  
33. google/draco: Draco is a library for compressing and decompressing 3D geometric meshes and point clouds. It is intended to improve the storage and transmission of 3D graphics. \- GitHub, diakses September 8, 2025, [https://github.com/google/draco](https://github.com/google/draco)  
34. Optimizing 3D data with Draco Geometry Compression \- Codelabs, diakses September 8, 2025, [https://codelabs.developers.google.com/codelabs/draco-3d](https://codelabs.developers.google.com/codelabs/draco-3d)  
35. Draco Compressed Meshes with glTF and 3D Tiles \- Cesium, diakses September 8, 2025, [https://cesium.com/blog/2018/04/09/draco-compression/](https://cesium.com/blog/2018/04/09/draco-compression/)  
36. Draco 3D Graphics Compression \- Google, diakses September 8, 2025, [https://google.github.io/draco/](https://google.github.io/draco/)  
37. DRACOLoader – three.js docs, diakses September 8, 2025, [https://threejs.org/docs/examples/en/loaders/DRACOLoader.html](https://threejs.org/docs/examples/en/loaders/DRACOLoader.html)  
38. DRACO Loader \- Three.js Tutorials, diakses September 8, 2025, [https://sbcode.net/threejs/loaders-draco/](https://sbcode.net/threejs/loaders-draco/)  
39. How to use draco loader? \- Questions \- three.js forum, diakses September 8, 2025, [https://discourse.threejs.org/t/how-to-use-draco-loader/5363](https://discourse.threejs.org/t/how-to-use-draco-loader/5363)  
40. How to optimize project for low-end computers? : r/threejs \- Reddit, diakses September 8, 2025, [https://www.reddit.com/r/threejs/comments/skk0f3/how\_to\_optimize\_project\_for\_lowend\_computers/](https://www.reddit.com/r/threejs/comments/skk0f3/how_to_optimize_project_for_lowend_computers/)  
41. Elevating Your 3D Web Experience: Best Practices for Three.js Development \- Medium, diakses September 8, 2025, [https://medium.com/@akshatarora7/elevating-your-3d-web-experience-best-practices-for-three-js-development-8b095b0f92be](https://medium.com/@akshatarora7/elevating-your-3d-web-experience-best-practices-for-three-js-development-8b095b0f92be)  
42. GLTF and / or GLB online optimization and compression \- Resources \- three.js forum, diakses September 8, 2025, [https://discourse.threejs.org/t/gltf-and-or-glb-online-optimization-and-compression/62753](https://discourse.threejs.org/t/gltf-and-or-glb-online-optimization-and-compression/62753)  
43. Optimizing ThreeJs for Mobile Devices \- MoldStud, diakses September 8, 2025, [https://moldstud.com/articles/p-optimizing-threejs-for-mobile-devices](https://moldstud.com/articles/p-optimizing-threejs-for-mobile-devices)  
44. LOD – three.js docs, diakses September 8, 2025, [https://threejs.org/docs/api/en/objects/LOD.html](https://threejs.org/docs/api/en/objects/LOD.html)  
45. Enhancing Three.js App Performance with LOD \- Wael Yasmina, diakses September 8, 2025, [https://waelyasmina.net/articles/enhancing-three-js-app-performance-with-lod/](https://waelyasmina.net/articles/enhancing-three-js-app-performance-with-lod/)  
46. How can I optimise my THREE.JS rendering? \- Questions, diakses September 8, 2025, [https://discourse.threejs.org/t/how-can-i-optimise-my-three-js-rendering/42251](https://discourse.threejs.org/t/how-can-i-optimise-my-three-js-rendering/42251)  
47. Performance tips \- Three.js Journey, diakses September 8, 2025, [https://threejs-journey.com/lessons/performance-tips](https://threejs-journey.com/lessons/performance-tips)  
48. Composables | TresJS, diakses September 8, 2025, [https://docs.tresjs.org/api/composables.html](https://docs.tresjs.org/api/composables.html)  
49. Vue 3 Animations Tutorial \#10 \- Using GSAP \- YouTube, diakses September 8, 2025, [https://www.youtube.com/watch?v=Fog0zKi9xzo](https://www.youtube.com/watch?v=Fog0zKi9xzo)  
50. Trigger animation by clicking button and reverse by scrolling up \- GSAP \- GreenSock, diakses September 8, 2025, [https://gsap.com/community/forums/topic/40257-trigger-animation-by-clicking-button-and-reverse-by-scrolling-up/](https://gsap.com/community/forums/topic/40257-trigger-animation-by-clicking-button-and-reverse-by-scrolling-up/)  
51. Best Practices for Button-Triggered GSAP Animations in React Before Re-rendering, diakses September 8, 2025, [https://gsap.com/community/forums/topic/40063-best-practices-for-button-triggered-gsap-animations-in-react-before-re-rendering/](https://gsap.com/community/forums/topic/40063-best-practices-for-button-triggered-gsap-animations-in-react-before-re-rendering/)  
52. Looking for a meta library using GSAP for ready-to-use animations, diakses September 8, 2025, [https://gsap.com/community/forums/topic/42396-looking-for-a-meta-library-using-gsap-for-ready-to-use-animations/](https://gsap.com/community/forums/topic/42396-looking-for-a-meta-library-using-gsap-for-ready-to-use-animations/)  
53. Flip | GSAP | Docs & Learning, diakses September 8, 2025, [https://gsap.com/docs/v3/Plugins/Flip/](https://gsap.com/docs/v3/Plugins/Flip/)  
54. GSAP Flip Plugin for Animation \- CSS-Tricks, diakses September 8, 2025, [https://css-tricks.com/gsap-flip-plugin-for-animation/](https://css-tricks.com/gsap-flip-plugin-for-animation/)  
55. Create SICK Transitions with the GSAP Flip Plugin\! \- YouTube, diakses September 8, 2025, [https://www.youtube.com/watch?v=viuZyJogbsQ](https://www.youtube.com/watch?v=viuZyJogbsQ)  
56. Using GSAP's Flip Plugin in Motion.page\!, diakses September 8, 2025, [https://motion.page/learn/using-gsaps-flip-plugin-in-motion-page-%F0%9F%94%A5/](https://motion.page/learn/using-gsaps-flip-plugin-in-motion-page-%F0%9F%94%A5/)  
57. Building an interactive web portfolio with Vue \+ Three.js — Part Three: Implementing Three.js | by Máximo Fernández | NicaSource | Medium, diakses September 8, 2025, [https://medium.com/nicasource/building-an-interactive-web-portfolio-with-vue-three-js-part-three-implementing-three-js-452cb375ef80](https://medium.com/nicasource/building-an-interactive-web-portfolio-with-vue-three-js-part-three-implementing-three-js-452cb375ef80)  
58. Three.js \- Responsive Design \- Tutorialspoint, diakses September 8, 2025, [https://www.tutorialspoint.com/threejs/threejs\_responsive\_design.htm](https://www.tutorialspoint.com/threejs/threejs_responsive_design.htm)  
59. Making Our Scenes Responsive (and also Dealing with Jaggies) | Discover three.js, diakses September 8, 2025, [https://discoverthreejs.com/book/first-steps/responsive-design/](https://discoverthreejs.com/book/first-steps/responsive-design/)  
60. Updating three.js scene on window re-size \- Stack Overflow, diakses September 8, 2025, [https://stackoverflow.com/questions/77719694/updating-three-js-scene-on-window-re-size](https://stackoverflow.com/questions/77719694/updating-three-js-scene-on-window-re-size)  
61. How do I make the three.js animation responsive? \- Questions, diakses September 8, 2025, [https://discourse.threejs.org/t/how-do-i-make-the-three-js-animation-responsive/2192](https://discourse.threejs.org/t/how-do-i-make-the-three-js-animation-responsive/2192)  
62. How to make Three.js FOV responsive to height AND width? \- Stack Overflow, diakses September 8, 2025, [https://stackoverflow.com/questions/55388260/how-to-make-three-js-fov-responsive-to-height-and-width](https://stackoverflow.com/questions/55388260/how-to-make-three-js-fov-responsive-to-height-and-width)  
63. PerspectiveCamera\#fov – three.js docs, diakses September 8, 2025, [https://threejs.org/docs/\#api/en/cameras/PerspectiveCamera.fov](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera.fov)  
64. Extend three.js With a Camera Controls Plugin, diakses September 8, 2025, [https://discoverthreejs.com/book/first-steps/camera-controls/](https://discoverthreejs.com/book/first-steps/camera-controls/)  
65. Implementing Touch and Gestures in ThreeJs Applications \- MoldStud, diakses September 8, 2025, [https://moldstud.com/articles/p-implementing-touch-and-gestures-in-threejs-applications](https://moldstud.com/articles/p-implementing-touch-and-gestures-in-threejs-applications)  
66. \`OrbitControls\` blocks scroll on mobile without ability to opt-out · Issue \#1233 · pmndrs/drei, diakses September 8, 2025, [https://github.com/pmndrs/drei/issues/1233](https://github.com/pmndrs/drei/issues/1233)  
67. OrbitalControls on mobile devices \- Questions \- three.js forum, diakses September 8, 2025, [https://discourse.threejs.org/t/orbitalcontrols-on-mobile-devices/58430](https://discourse.threejs.org/t/orbitalcontrols-on-mobile-devices/58430)  
68. Three.js \- Stats \- Tutorialspoint, diakses September 8, 2025, [https://www.tutorialspoint.com/threejs/threejs\_stats.htm](https://www.tutorialspoint.com/threejs/threejs_stats.htm)  
69. mrdoob/stats.js: JavaScript Performance Monitor \- GitHub, diakses September 8, 2025, [https://github.com/mrdoob/stats.js/](https://github.com/mrdoob/stats.js/)  
70. Stats | Cientos \- TresJS, diakses September 8, 2025, [https://cientos.tresjs.org/guide/misc/stats](https://cientos.tresjs.org/guide/misc/stats)  
71. THREE.JS \- DEBUG AND STATS \- GitHub Pages, diakses September 8, 2025, [https://giridhar7632.github.io/Three.js/06-debug-and-stats.html](https://giridhar7632.github.io/Three.js/06-debug-and-stats.html)  
72. GoogleChrome/lighthouse: Automated auditing, performance metrics, and best practices for the web. \- GitHub, diakses September 8, 2025, [https://github.com/GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse)  
73. Introduction to Lighthouse \- Chrome for Developers, diakses September 8, 2025, [https://developer.chrome.com/docs/lighthouse/overview](https://developer.chrome.com/docs/lighthouse/overview)  
74. How to Run Local Performance Tests with Google Lighthouse \- NitroPack, diakses September 8, 2025, [https://nitropack.io/blog/post/how-to-run-local-performance-tests-with-lighthouse](https://nitropack.io/blog/post/how-to-run-local-performance-tests-with-lighthouse)  
75. Performance Testing Using Playwright and Lighthouse: Automate What Matters Most, diakses September 8, 2025, [https://testrig.medium.com/performance-testing-using-playwright-and-lighthouse-automate-what-matters-most-82c303c4de0e](https://testrig.medium.com/performance-testing-using-playwright-and-lighthouse-automate-what-matters-most-82c303c4de0e)  
76. treosh/lighthouse-plugin-field-performance \- GitHub, diakses September 8, 2025, [https://github.com/treosh/lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)  
77. Playwright: Fast and reliable end-to-end testing for modern web apps, diakses September 8, 2025, [https://playwright.dev/](https://playwright.dev/)  
78. Headless chrome – testing webgl using playwright \- createIT, diakses September 8, 2025, [https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/](https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/)  
79. Testing 3D applications with Playwright on GPU | by Lev Cheliadinov \- Promaton, diakses September 8, 2025, [https://blog.promaton.com/testing-3d-applications-with-playwright-on-gpu-1e9cfc8b54a9](https://blog.promaton.com/testing-3d-applications-with-playwright-on-gpu-1e9cfc8b54a9)  
80. What is Visual Regression Testing: Technique, Importance | BrowserStack, diakses September 8, 2025, [https://www.browserstack.com/percy/visual-regression-testing](https://www.browserstack.com/percy/visual-regression-testing)  
81. Visual Testing for Websites and Web Applications \- Applitools, diakses September 8, 2025, [https://applitools.com/solutions/web-testing/](https://applitools.com/solutions/web-testing/)  
82. Percy | Visual testing as a service, diakses September 8, 2025, [https://percy.io/](https://percy.io/)  
83. What is Visual Regression Testing? Tools & Examples \- Applitools, diakses September 8, 2025, [https://applitools.com/blog/visual-regression-testing/](https://applitools.com/blog/visual-regression-testing/)  
84. Visual Regression Testing with Percy or Applitools: Catching UI Bugs Before Users Do, diakses September 8, 2025, [https://medium.com/@soujitdas30/visual-regression-testing-with-percy-or-applitools-catching-ui-bugs-before-users-do-84dc9a6a929c](https://medium.com/@soujitdas30/visual-regression-testing-with-percy-or-applitools-catching-ui-bugs-before-users-do-84dc9a6a929c)  
85. Visual testing and review platform | Percy by BrowserStack, diakses September 8, 2025, [https://www.browserstack.com/percy](https://www.browserstack.com/percy)  
86. Visual testing as a service \- Percy, diakses September 8, 2025, [https://percy.io/visual-testing](https://percy.io/visual-testing)  
87. Visual Regression Testing with Percy | Test Evolve Documentation, diakses September 8, 2025, [https://testevolve.github.io/docs/Spark/Tutorials/visual-regression-testing-percy](https://testevolve.github.io/docs/Spark/Tutorials/visual-regression-testing-percy)  
88. WebGL vs. Three.js: Key Differences for 3D Graphics \- PixelFreeStudio Blog, diakses September 8, 2025, [https://blog.pixelfreestudio.com/webgl-vs-three-js-key-differences-for-3d-graphics/](https://blog.pixelfreestudio.com/webgl-vs-three-js-key-differences-for-3d-graphics/)