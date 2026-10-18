[English](README.md) | Türkçe

# Reklam Dönüşüm Tahmini

Reklamı gören birinin ürünü alıp almayacağını yaşından ve tahmini maaşından tahmin eder. Python ile yazılan eğitim hattı sınıflandırma modellerini tekrarlı çapraz doğrulamayla karşılaştırır; küçük bir web sitesi her modelin karar haritasını gösterir, karar eşiğini değiştirmeye izin verir ve tarayıcıda çalışır.

> **Durum:** v1.0 geliştiriliyor. Bu README proje planıdır, yayından önce tamamlanacak.
>
> **Veri hakkında:** 400 kişilik, yaygın kullanılan bir eğitim veri seti (`Social_Network_Ads.csv`). Gerçek bir kampanyanın verisi değildir; sonuçlar gerçek müşterilerin davranışını değil, yöntemlerin nasıl çalıştığını gösterir.

## Özellikler

### Eğitim hattı (Python)
- Veri doğrulama: eğitimden önce sütunlar, değer aralıkları ve kategoriler kontrol edilir.
- Tekrarlı, sınıf oranını koruyan 10 katlı çapraz doğrulamayla model karşılaştırması: lojistik regresyon, polinom özellikli lojistik regresyon, KNN, SVM (RBF), Random Forest ve her zaman "almaz" diyen bir referans model.
- Metrikler ortalama ± standart sapma olarak: ROC AUC, F1, kesinlik, duyarlılık ve doğruluk; doğruluk, dengesiz veride yanıltıcı olduğu için referans modelin yanında gösterilir.
- Cinsiyet modele alınmaz: burada bilgi eklemiyor, reklam hedeflemede kullanılması da bir adalet sorusu. Cinsiyetli ve cinsiyetsiz karşılaştırma raporun parçasıdır.
- JSON'a aktarma: her modelin 100×100'lük yaş × maaş ızgarasındaki olasılıkları, çapraz doğrulama skorları ve eşik görünümü için katlama dışı (out-of-fold) tahminleri.
- pytest ile birim testleri.

### Web sitesi
- Karar haritası: her model için yaş ve maaşa göre satın alma olasılığı, verideki 400 kişi ve senin noktan.
- Girdiğin yaş ve maaş için tahmin; verinin aralığı dışında uyarı.
- Eşik kaydırıcı ("reklamı kim görsün?"): kaydırdıkça kesinlik, duyarlılık, karışıklık matrisi ve ROC eğrisi güncellenir.
- Model sayfası: karşılaştırma tablosu, doğruluğun neden yanılttığı, cinsiyet kararı ve model kartı (veri kaynağı, sınırlar, kullanım amacı).
- Türkçe / İngilizce, koyu / açık tema. Girdiğin hiçbir şey gönderilmez ya da saklanmaz.

## Veri Seti

400 kişi: cinsiyet, yaş, tahmini maaş ve reklamı yapılan ürünü alıp almadığı (143 aldı, 257 almadı). Yaygın bir eğitim veri seti; özgün kaynağı belgelenmemiştir.

## Ekran Görüntüleri

_Yakında._

## Kullanılan Teknolojiler

- Python, pandas, NumPy, scikit-learn, pytest
- HTML, CSS, JavaScript (framework ve derleme adımı yok), `node --test`
- Vercel

## Kurulum ve Çalıştırma

_Yakında._

## Öğrendiklerim

_Yakında._

## Gelecek Planları

- İki sayısal sütun ve evet/hayır hedefi olan kendi CSV dosyanı yükleme.
- Olasılık kalibrasyonu grafiği.
- Ek veri setleri.
