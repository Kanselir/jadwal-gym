const dailyPostureRoutines = [
  { id: "cobra_pose", name: "Cobra Pose", type: "duration", sets: "Rutinitas Postur", minDuration: 2.5, note: "Tahan posisi mengangkat dada total selama 2.5 menit." },
  { id: "cat_cow", name: "Cat-Cow Stretch", type: "reps", sets: "Rutinitas Postur", minReps: 15, note: "Lakukan gerakan melengkungkan punggung total 15 repetisi." },
  { id: "forward_bend", name: "Forward Bend", type: "duration", sets: "Rutinitas Postur", minDuration: 0.5, note: "Tahan posisi membungkuk menyentuh ujung kaki total 30 detik (0.5 menit)." },
  { id: "bridge_pose", name: "Bridge Pose", type: "duration", sets: "Rutinitas Postur", minDuration: 1.5, note: "Tahan posisi mengangkat panggul total selama 1.5 menit." },
  { id: "chin_tucks_wall_angels", name: "Chin Tucks & Wall Angels", type: "reps", sets: "Rutinitas Postur", minReps: 25, note: "Total 10 rep menarik dagu dan 15 rep menggerakkan tangan di dinding." },
  { id: "hanging", name: "Gelantungan / Pull Up", type: "duration", sets: "Rutinitas Postur", minDuration: 0.5, note: "Bergantung di palang pull up total 30 detik (dicicil sepanjang hari)." }
];

export const scheduleData = {
  1: { // Senin
    title: "Tubuh Atas & Ketangkasan + Rutinitas Postur",
    description: "Melatih kekuatan tubuh bagian atas, ketangkasan tinju, serta rutinitas fleksibilitas dan perbaikan postur tubuh.",
    classes: [
      {
        id: "diskrit",
        name: "Logika dan Struktur Diskrit (B)",
        code: "ES234103",
        time: "07:00 - 11:20",
        room: "SI 4201",
        lecturer: "Ahmad Muklason S.Kom., M.Sc., Ph.D."
      }
    ],
    exercises: [
      ...dailyPostureRoutines,
      { id: "pushup", name: "Push Up", type: "reps", sets: "Tubuh Atas", minReps: 40, note: "Selesaikan total 40 repetisi (istirahatkan lengan kapan pun butuh)." },
      { id: "pullup", name: "Gelantungan / Pull Up", type: "reps", sets: "Tubuh Atas", minReps: 10, note: "Selesaikan total 10 repetisi (bisa dicicil perlahan)." },
      { id: "barbell", name: "Angkat Barbel / Dumbbell", type: "reps", sets: "Tubuh Atas", minReps: 50, note: "Kombinasikan untuk gerakan melatih otot bisep atau bahu." },
      { id: "boxing", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." },
      { id: "door_stretch", name: "Door Frame Stretch", type: "duration", sets: "Peregangan", minDuration: 1.0, note: "Regangkan dada di kusen pintu total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  2: { // Selasa
    title: "Tubuh Bawah & Kekuatan Sentral + Rutinitas Postur",
    description: "Melatih otot kaki, core perut/back, kardio lompat tali, serta peregangan hip flexor.",
    classes: [],
    exercises: [
      ...dailyPostureRoutines,
      { id: "squat", name: "Squat Jump", type: "reps", sets: "Tubuh Bawah", minReps: 45, note: "Selesaikan total 45 repetisi dengan memastikan punggung tetap lurus." },
      { id: "plank", name: "Plank", type: "duration", sets: "Core", minDuration: 1.0, note: "Tahan posisi total selama 1 menit." },
      { id: "situp", name: "Sit Up", type: "reps", sets: "Core", minReps: 45, note: "Selesaikan total 45 repetisi gerakan perut." },
      { id: "skipping", name: "Lompat Tali / Skipping", type: "reps", sets: "Kardio", minReps: 600, note: "Melompat total sebanyak 600 kali." },
      { id: "hip_stretch", name: "Hip Flexor Stretch", type: "duration", sets: "Peregangan", minDuration: 1.0, note: "Tahan posisi lunge total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  3: { // Rabu
    title: "Kardio Menengah & Fleksibilitas + Rutinitas Postur",
    description: "Sepeda statis, samsak tinju 100 pukulan, peregangan thoracic extension, serta rutinitas postur.",
    classes: [
      {
        id: "design_thinking",
        name: "Design Thinking (B)",
        code: "ES234105",
        time: "09:40 - 14:10",
        room: "SI 1101",
        lecturer: "Dimas Agung Perkasa S.Kom., M.Kom."
      },
      {
        id: "ekonomi_bisnis",
        name: "Pengantar Ekonomi dan Bisnis (B)",
        code: "ES234104",
        time: "12:30 - 17:10",
        room: "SI 4102",
        lecturer: "Dr. Mudjahidin S.T., M.T."
      }
    ],
    exercises: [
      ...dailyPostureRoutines,
      { id: "bike_medium", name: "Sepeda Statis", type: "duration", sets: "Kardio", minDuration: 30, note: "Intensitas Sedang (30 - 40 menit)." },
      { id: "boxing_medium", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." },
      { id: "thoracic_ext", name: "Thoracic Extension", type: "reps", sets: "Peregangan", minReps: 10, note: "Regangkan punggung atas ke belakang total 10 repetisi." }
    ]
  },
  4: { // Kamis
    title: "Tubuh Atas & Ketangkasan + Rutinitas Postur",
    description: "Melatih kekuatan tubuh bagian atas, ketangkasan tinju, serta rutinitas fleksibilitas dan perbaikan postur tubuh.",
    classes: [
      {
        id: "infrastruktur_ti",
        name: "Infrastruktur TI (B)",
        code: "ES234106",
        time: "07:00 - 11:20",
        room: "SI 1101",
        lecturer: "Nisfu Asrul Sani S.Kom., M.Sc."
      },
      {
        id: "organisasi_bisnis",
        name: "Organisasi dan Fungsional Bisnis (B)",
        code: "ES234102",
        time: "12:30 - 17:10",
        room: "SI 4102",
        lecturer: "Dr. Mudjahidin S.T., M.T."
      }
    ],
    exercises: [
      ...dailyPostureRoutines,
      { id: "pushup", name: "Push Up", type: "reps", sets: "Tubuh Atas", minReps: 40, note: "Selesaikan total 40 repetisi (istirahatkan lengan kapan pun butuh)." },
      { id: "pullup", name: "Gelantungan / Pull Up", type: "reps", sets: "Tubuh Atas", minReps: 10, note: "Selesaikan total 10 repetisi (bisa dicicil perlahan)." },
      { id: "barbell", name: "Angkat Barbel / Dumbbell", type: "reps", sets: "Tubuh Atas", minReps: 50, note: "Kombinasikan untuk gerakan melatih otot bisep atau bahu." },
      { id: "boxing", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." },
      { id: "door_stretch", name: "Door Frame Stretch", type: "duration", sets: "Peregangan", minDuration: 1.0, note: "Regangkan dada di kusen pintu total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  5: { // Jumat
    title: "Tubuh Bawah & Kekuatan Sentral + Rutinitas Postur",
    description: "Melatih otot kaki, core perut/back, kardio lompat tali, serta peregangan hip flexor.",
    classes: [
      {
        id: "matematika2",
        name: "Matematika (2)",
        code: "SM234152",
        time: "07:00 - 08:40",
        room: "TW1-302",
        lecturer: "Belum ada dosen"
      }
    ],
    exercises: [
      ...dailyPostureRoutines,
      { id: "squat", name: "Squat Jump", type: "reps", sets: "Tubuh Bawah", minReps: 45, note: "Selesaikan total 45 repetisi dengan memastikan punggung tetap lurus." },
      { id: "plank", name: "Plank", type: "duration", sets: "Core", minDuration: 1.0, note: "Tahan posisi total selama 1 menit." },
      { id: "situp", name: "Sit Up", type: "reps", sets: "Core", minReps: 45, note: "Selesaikan total 45 repetisi gerakan perut." },
      { id: "skipping", name: "Lompat Tali / Skipping", type: "reps", sets: "Kardio", minReps: 600, note: "Melompat total sebanyak 600 kali." },
      { id: "hip_stretch", name: "Hip Flexor Stretch", type: "duration", sets: "Peregangan", minDuration: 1.0, note: "Tahan posisi lunge total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  6: { // Sabtu
    title: "Kardio Menengah & Fleksibilitas + Rutinitas Postur",
    description: "Sepeda statis, samsak tinju 100 pukulan, peregangan thoracic extension, serta rutinitas postur.",
    classes: [],
    exercises: [
      ...dailyPostureRoutines,
      { id: "bike_light", name: "Sepeda Statis", type: "duration", sets: "Kardio", minDuration: 20, note: "Intensitas Santai (20 - 30 menit)." },
      { id: "boxing_light", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." },
      { id: "thoracic_ext", name: "Thoracic Extension", type: "reps", sets: "Peregangan", minReps: 10, note: "Regangkan punggung atas ke belakang total 10 repetisi." }
    ]
  },
  0: { // Minggu
    title: "Istirahat Total",
    description: "Bebaskan tubuh sepenuhnya dari olahraga berat agar hormon pertumbuhan tulang dan pemulihan otot bekerja maksimal saat tidur.",
    classes: [],
    exercises: []
  }
};

export const unscheduledClasses = [
  {
    id: "pteic",
    name: "Pengantar Teknologi Elektro dan Informatika Cerdas (P)",
    code: "EE234101",
    lecturer: "Belum ada dosen",
    note: "Belum ada jadwal pasti"
  }
];
