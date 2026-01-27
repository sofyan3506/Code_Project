from datetime import datetime
from random import randint

# --- Bagian 1: Cek Waktu ---
sekarang = datetime.now()
detik = sekarang.second

print(f"Detik saat ini: {detik}")

if detik > 30:
    print("Kelewatan!")
elif detik < 30:
    print("Kurang beberapa detik lagi...")
else:
    print("Terlalu hoki! Tepat di angka 30!")

print("-" * 30)
print("Jika berhasil pada percobaan ke-1, kamu adalah Dewa Kehokian!")
print("Jika berhasil pada percobaan lebih dari 50, kamu adalah Normal.")
print("-" * 30)

# --- Bagian 2: Simulasi Keberuntungan ---

ulang = "y"
while ulang.lower() == "y":

    percobaan = 0
    while True:
        print("\nMulai percobaan baru...")
        percobaan += 1
        acak1 = randint(0, 100)
        acak2 = randint(0, 100)
        
        # Menampilkan status setiap percobaan
        print(f"Percobaan ke-{percobaan}: {acak1} vs {acak2}")

        # Cek jika ada angka 100
        if acak1 == 100 or acak2 == 100:
            print(f"Hoki! Dapat angka 100 di percobaan ke-{percobaan}!")

        # Cek jika ada angka 0
        if acak1 == 0 or acak2 == 0:
            print(f"Dapat angka 0 di percobaan ke-{percobaan}, tapi masih kurang...")

        # Kondisi berhenti: Kedua angka sama
        if acak1 == acak2:
            print(f"\nSANGAT HOKI! Dapat nilai kembar ({acak1}) di percobaan ke-{percobaan}!")
            break
    print(f"Total percobaan yang dibutuhkan: {percobaan}")
    if percobaan == 1:
        print("Kamu adalah Dewa Kehokian!")
    elif percobaan <= 100:
        print("Kamu adalah Orang Biasa.")
    else:
        print("Kamu sedang memiliki sedikit keberuntungan.")
    ulang = input("Mau coba lagi? (y/n): ").lower()
print("Terima kasih telah bermain! Semoga hari Anda menyenangkan!")
