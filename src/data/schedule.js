export const scheduleData = {
  1: { // Senin
    title: "Fokus Tubuh Atas (Push, Pull, & Core)",
    description: "Fokus hari ini adalah melatih kekuatan tubuh bagian atas dengan menyeimbangkan gerakan mendorong dan menarik.",
    exercises: [
      { id: "pushup", name: "Push Up", type: "reps", sets: "3 - 4 set", minReps: 8, maxReps: 15, note: "Sesuaikan dengan kemampuan, jaga postur tubuh tetap lurus." },
      { id: "pullup", name: "Gelantungan / Pull Up", type: "reps", sets: "3 - 4 set", minReps: 5, maxReps: 10, note: "Jika belum bisa pull up penuh, lakukan gerakan menahan badan di atas palang selama mungkin, atau negative pull up." },
      { id: "barbell", name: "Angkat Barbel / Dumbbell", type: "reps", sets: "3 set", minReps: 10, maxReps: 15, note: "Lakukan bervariasi, misalnya set pertama untuk Bicep Curl dan set berikutnya untuk Shoulder Press." },
      { id: "situp_upper", name: "Sit Up", type: "reps", sets: "3 set", minReps: 15, maxReps: 20, note: "Lakukan perlahan, rasakan kontraksi di perut, jangan menarik leher." }
    ]
  },
  2: { // Selasa
    title: "Fokus Tubuh Bawah & Kardio (Legs & Cardio)",
    description: "Hari ini didedikasikan untuk melatih otot terbesar di tubuh (kaki) yang akan memacu detak jantung dengan cepat.",
    exercises: [
      { id: "squat", name: "Squat Jump", type: "reps", sets: "4 set", minReps: 12, maxReps: 15, note: "Mendaratlah dengan lutut sedikit ditekuk untuk meredam benturan. Bagus untuk tenaga ledak." },
      { id: "skipping", name: "Lompat Tali / Skipping", type: "duration", sets: "4 - 5 set", minDuration: 10, maxDuration: 15, note: "Lompat intens 1 menit, istirahat 30 detik. (Total 10-15 menit)." }
    ]
  },
  3: { // Rabu
    title: "Kardio Menengah & Perut",
    description: "Sesi ini berfungsi untuk pemulihan aktif (active recovery) otot lengan dan kaki, sambil tetap melatih ketahanan jantung.",
    exercises: [
      { id: "bike_medium", name: "Sepeda Statis", type: "duration", sets: "1 Sesi panjang", minDuration: 30, maxDuration: 40, note: "Intensitas Sedang. Anda masih bisa berbicara, tetapi mulai sedikit terengah-engah." },
      { id: "situp_core", name: "Sit Up / Variasi Perut Lainnya", type: "reps", sets: "3 set", minReps: 15, maxReps: 20, note: "" }
    ]
  },
  4: { // Kamis (Sama dengan Senin)
    title: "Fokus Tubuh Atas (Push, Pull, & Core)",
    description: "Fokus hari ini adalah melatih kekuatan tubuh bagian atas dengan menyeimbangkan gerakan mendorong dan menarik.",
    exercises: [
      { id: "pushup", name: "Push Up", type: "reps", sets: "3 - 4 set", minReps: 8, maxReps: 15, note: "Sesuaikan dengan kemampuan, jaga postur tubuh tetap lurus." },
      { id: "pullup", name: "Gelantungan / Pull Up", type: "reps", sets: "3 - 4 set", minReps: 5, maxReps: 10, note: "Jika belum bisa pull up penuh, lakukan gerakan menahan badan di atas palang selama mungkin, atau negative pull up." },
      { id: "barbell", name: "Angkat Barbel / Dumbbell", type: "reps", sets: "3 set", minReps: 10, maxReps: 15, note: "Lakukan bervariasi, misalnya set pertama untuk Bicep Curl dan set berikutnya untuk Shoulder Press." },
      { id: "situp_upper", name: "Sit Up", type: "reps", sets: "3 set", minReps: 15, maxReps: 20, note: "Lakukan perlahan, rasakan kontraksi di perut, jangan menarik leher." }
    ]
  },
  5: { // Jumat (Sama dengan Selasa)
    title: "Fokus Tubuh Bawah & Kardio (Legs & Cardio)",
    description: "Hari ini didedikasikan untuk melatih otot terbesar di tubuh (kaki) yang akan memacu detak jantung dengan cepat.",
    exercises: [
      { id: "squat", name: "Squat Jump", type: "reps", sets: "4 set", minReps: 12, maxReps: 15, note: "Mendaratlah dengan lutut sedikit ditekuk untuk meredam benturan. Bagus untuk tenaga ledak." },
      { id: "skipping", name: "Lompat Tali / Skipping", type: "duration", sets: "4 - 5 set", minDuration: 10, maxDuration: 15, note: "Lompat intens 1 menit, istirahat 30 detik. (Total 10-15 menit)." }
    ]
  },
  6: { // Sabtu
    title: "Kardio Ringan",
    description: "Tujuannya hanya untuk memperlancar sirkulasi darah dan membantu pemulihan otot-otot yang sudah dilatih selama seminggu.",
    exercises: [
      { id: "bike_light", name: "Sepeda Statis", type: "duration", sets: "1 Sesi", minDuration: 20, maxDuration: 30, note: "Intensitas Santai." }
    ]
  },
  0: { // Minggu
    title: "Istirahat Total",
    description: "Berikan waktu bagi otot dan sistem saraf Anda untuk tumbuh dan memperbaiki diri. Tidur yang cukup sangat krusial di hari ini.",
    exercises: []
  }
};
