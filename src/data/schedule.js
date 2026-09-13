const dailyPostureRoutines = [
  { id: "cobra_pose", name: "Cobra Pose", type: "duration", sets: "Rutinitas Postur", minDuration: 2.5, note: "Tahan posisi mengangkat dada total selama 2.5 menit." },
  { id: "cat_cow", name: "Cat-Cow Stretch", type: "reps", sets: "Rutinitas Postur", minReps: 15, note: "Lakukan gerakan melengkungkan punggung total 15 repetisi." },
  { id: "forward_bend", name: "Forward Bend", type: "duration", sets: "Rutinitas Postur", minDuration: 0.5, note: "Tahan posisi membungkuk menyentuh ujung kaki total 30 detik (0.5 menit)." },
  { id: "bridge_pose", name: "Bridge Pose", type: "duration", sets: "Rutinitas Postur", minDuration: 1.5, note: "Tahan posisi mengangkat panggul total selama 1.5 menit." },
  { id: "chin_tucks_wall_angels", name: "Chin Tucks & Wall Angels", type: "reps", sets: "Rutinitas Postur", minReps: 25, note: "Total 10 rep menarik dagu dan 15 rep menggerakkan tangan di dinding." },
  { id: "hanging", name: "Gelantungan / Pull Up", type: "duration", sets: "Rutinitas Postur", minDuration: 0.5, note: "Bergantung di palang pull up total 30 detik (dicicil sepanjang hari)." }
];

// 4-Day Rotating Workout Cycle
export const cycleData = {
  1: {
    title: "Hari 1: Latihan Tangan & Lengan (Arm & Upper Body)",
    description: "Melatih kekuatan tubuh bagian atas (dada, bisep, trisep, bahu, tinju) + Rutinitas Postur Harian.",
    exercises: [
      ...dailyPostureRoutines,
      { id: "pushup", name: "Push Up", type: "reps", sets: "Tubuh Atas / Tangan", minReps: 40, note: "Selesaikan total 40 repetisi (istirahatkan lengan kapan pun butuh)." },
      { id: "pullup", name: "Gelantungan / Pull Up", type: "reps", sets: "Tubuh Atas / Tangan", minReps: 10, note: "Selesaikan total 10 repetisi (bisa dicicil perlahan)." },
      { id: "barbell", name: "Angkat Barbel / Dumbbell", type: "reps", sets: "Tubuh Atas / Tangan", minReps: 50, note: "Kombinasikan untuk gerakan melatih otot bisep atau bahu." },
      { id: "boxing", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan Tangan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." },
      { id: "door_stretch", name: "Door Frame Stretch", type: "duration", sets: "Peregangan", minDuration: 1.0, note: "Regangkan dada di kusen pintu total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  2: {
    title: "Hari 2: Latihan Kaki & Tubuh Bawah (Legs & Cardio)",
    description: "Melatih otot paha, betis, kekuatan kaki, lompat tali, dan kardio + Rutinitas Postur Harian.",
    exercises: [
      ...dailyPostureRoutines,
      { id: "squat", name: "Squat Jump", type: "reps", sets: "Tubuh Bawah / Kaki", minReps: 45, note: "Selesaikan total 45 repetisi dengan memastikan punggung tetap lurus." },
      { id: "skipping", name: "Lompat Tali / Skipping", type: "reps", sets: "Kardio Kaki", minReps: 600, note: "Melompat total sebanyak 600 kali." },
      { id: "bike_medium", name: "Sepeda Statis", type: "duration", sets: "Kardio Kaki", minDuration: 30, note: "Intensitas Sedang (30 - 40 menit)." },
      { id: "hip_stretch", name: "Hip Flexor Stretch", type: "duration", sets: "Peregangan Kaki", minDuration: 1.0, note: "Tahan posisi lunge total 1 menit (30d kiri, 30d kanan)." }
    ]
  },
  3: {
    title: "Hari 3: Latihan Perut & Core (Abdominal & Core)",
    description: "Melatih otot perut (abs), kekuatan sentral badan, dan fleksibilitas punggung + Rutinitas Postur Harian.",
    exercises: [
      ...dailyPostureRoutines,
      { id: "situp", name: "Sit Up", type: "reps", sets: "Core / Perut", minReps: 45, note: "Selesaikan total 45 repetisi gerakan perut." },
      { id: "plank", name: "Plank", type: "duration", sets: "Core / Perut", minDuration: 1.0, note: "Tahan posisi total selama 1 menit." },
      { id: "thoracic_ext", name: "Thoracic Extension", type: "reps", sets: "Peregangan Punggung", minReps: 10, note: "Regangkan punggung atas ke belakang total 10 repetisi." },
      { id: "boxing_core", name: "Samsak Tinju", type: "reps", sets: "Ketangkasan", minReps: 100, note: "Aktif memukul total sebanyak 100 pukulan." }
    ]
  },
  4: {
    title: "Hari 4: Istirahat Total (Rest Day)",
    description: "Bebaskan tubuh sepenuhnya dari olahraga berat agar hormon pertumbuhan tulang dan pemulihan otot bekerja maksimal.",
    exercises: []
  }
};

// Legacy Schedule Mapping for College Classes & Days of Week
export const scheduleData = {
  1: { title: "Senin", description: "", classes: [{ id: "diskrit", name: "Logika dan Struktur Diskrit (B)", code: "ES234103", time: "07:00 - 11:20", room: "SI 4201", lecturer: "Ahmad Muklason S.Kom., M.Sc., Ph.D." }] },
  2: { title: "Selasa", description: "", classes: [] },
  3: { title: "Rabu", description: "", classes: [{ id: "design_thinking", name: "Design Thinking (B)", code: "ES234105", time: "09:40 - 14:10", room: "SI 1101", lecturer: "Dimas Agung Perkasa S.Kom., M.Kom." }, { id: "ekonomi_bisnis", name: "Pengantar Ekonomi dan Bisnis (B)", code: "ES234104", time: "12:30 - 17:10", room: "SI 4102", lecturer: "Dr. Mudjahidin S.T., M.T." }] },
  4: { title: "Kamis", description: "", classes: [{ id: "infrastruktur_ti", name: "Infrastruktur TI (B)", code: "ES234106", time: "07:00 - 11:20", room: "SI 1101", lecturer: "Nisfu Asrul Sani S.Kom., M.Sc." }, { id: "organisasi_bisnis", name: "Organisasi dan Fungsional Bisnis (B)", code: "ES234102", time: "12:30 - 17:10", room: "SI 4102", lecturer: "Dr. Mudjahidin S.T., M.T." }] },
  5: { title: "Jumat", description: "", classes: [{ id: "matematika2", name: "Matematika (2)", code: "SM234152", time: "07:00 - 08:40", room: "TW1-302", lecturer: "Belum ada dosen" }] },
  6: { title: "Sabtu", description: "", classes: [] },
  0: { title: "Minggu", description: "", classes: [] }
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
