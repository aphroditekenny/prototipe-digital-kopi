**penganggaran kinerja** adalah komponen penting dari strategi jaminan kualitas dan kinerja komprehensif untuk platform KopiKala. Ini bukan sekadar pertimbangan, melainkan harus diukur dan dikelola secara proaktif selama siklus hidup pengembangan.

Berikut adalah rincian mengenai anggaran kinerja:

### **Penganggaran Kinerja dan Pemantauan Berkelanjutan**

1.  **Penetapan KPI Kinerja**
    Sebelum pengembangan dimulai, anggaran kinerja yang ketat akan ditentukan. Metrik utama (KPI) yang akan dipantau secara berkelanjutan meliputi:
    *   **Frame Per Detik (FPS)**: Targetnya adalah menjaga **60 FPS yang konsisten**.
    *   ***Draw Calls***: Harus **kurang dari 200 per *frame*** jika memungkinkan. *Draw call* yang tinggi merupakan hambatan kinerja utama.
    *   ***Total Blocking Time* (TBT) & *Largest Contentful Paint* (LCP)**: Core Web Vitals ini tetap relevan dan akan dipantau.
    *   **Waktu Muat Aset**: Ini mengacu pada waktu yang dibutuhkan untuk mengunduh dan mendekode model 3D. Kompresi geometri dengan Draco secara fundamental akan memengaruhi pengalaman pemuatan *frontend*, menawarkan pertukaran antara unduhan yang lebih cepat dan biaya CPU untuk dekompresi.

2.  **Pemantauan *Real-Time***
    Selama fase pengembangan, pustaka **stats.js** akan diintegrasikan. Ini akan dilakukan melalui komponen `<Stats />` yang tersedia di `@tresjs/cientos`. Fitur ini menyediakan tampilan di layar mengenai FPS, penggunaan memori, dan waktu *render*, memberikan umpan balik langsung kepada pengembang tentang dampak kinerja dari perubahan yang mereka buat.

3.  **Audit Otomatis dengan Lighthouse**
    Google Lighthouse akan diintegrasikan ke dalam alur kerja CI/CD (Continuous Integration/Continuous Deployment). Setiap *pull request* akan memicu audit Lighthouse secara otomatis untuk memeriksa regresi dalam kinerja, aksesibilitas, dan praktik terbaik. Hal ini dirancang untuk **mencegah penurunan kinerja digabungkan ke cabang utama**.

### **Pentingnya Strategis**

Penganggaran kinerja, bersama dengan pengujian regresi visual, akan diintegrasikan ke dalam alur kerja CI/CD. Ini berarti bahwa **sebuah *pull request* yang menyebabkan skor kinerja turun di bawah ambang batas yang ditetapkan akan secara otomatis gagal dalam pemeriksaannya**. Pendekatan ini mengubah jaminan kualitas dari aktivitas reaktif menjadi disiplin proaktif dan preventif, memastikan bahwa kinerja dan ketepatan visual diperlakukan sebagai persyaratan kelas satu.

Fase 1 dari peta jalan pengembangan memprioritaskan "Membangun dan mengotomatisasi seluruh alur optimisasi aset 3D" sebelum pengembangan fitur signifikan dimulai. Ini adalah langkah de-risking yang kritis untuk memastikan semua pengembangan fitur selanjutnya terjadi dalam kerangka kerja yang sadar kinerja, mencegah pengerjaan ulang yang mahal di kemudian hari. Alur kerja optimisasi aset 3D yang ketat, yang mencakup target kinerja ini, sangat penting karena aset yang dioptimalkan dengan buruk dapat sendirian merusak pengalaman pengguna, terlepas dari seberapa baik arsitektur aplikasinya.