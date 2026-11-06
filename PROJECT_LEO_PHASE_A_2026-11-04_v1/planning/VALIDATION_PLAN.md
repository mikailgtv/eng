# طرح اعتبارسنجی آینده

> Project Leo · Phase A · 2026-11-04 · v1
> موجودی/قرارداد پیشنهادی؛ پیاده‌سازی، build یا اجرای فاز بعدی انجام نشده است.

این سند برنامهٔ تست است؛ اجرای تست برنامه در A نیست.

| لایه | شاهد لازم |
|---|---|
| domain/grade | ورودی معتبر/نامعتبر، چند پاسخ صحیح، null self/manual، deterministic result و parity قواعد بازاستفاده‌شده |
| repository | transaction rollback، dedupe، profile separation، migration از snapshot معتبر، corrupt/space-full |
| content | graph/ref/schema/rights/review validation، unknown/newer version، large batches و zip traversal/bomb |
| learner journey | درس→تمرین→feedback→progress→review، بازگشت/restart/reboot/airplane mode با data واقعی تست |
| audio | local file decode/play واقعی، pause/seek، deny/interruption/record/replay/delete؛ physical mic از fake device جدا |
| UI/a11y | phone/tablet RTL/LTR، TalkBack، text scaling، keyboard/dnd alternative، reduced/low tier |
| enterprise | roles/tenant/class scope، revoked session، cross-tenant IDOR، CSV/PDF permissions، audit failure |
| sync | duplicate/reorder/retry، conflict، clock skew، tombstones، no ACK before durable commit |
| release | artifact واقعی، install/upgrade، signing ownership، permission diff و offline launch بدون Metro |

همهٔ state-changing tests روی کپی/fixture دورریختنی با backup معتبر؛ DB اصلی read-only. هیچ تست از ضعف environment یا configuration به PASS تبدیل نشود. mock/simulated/real و NOT_TESTED با دلیل ثبت شوند؛ نتایج flaky تکرار تا سبز نشوند و assertions برای عبور تغییر نکنند.
