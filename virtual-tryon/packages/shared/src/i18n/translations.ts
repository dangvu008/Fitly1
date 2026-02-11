/**
 * File: translations.ts
 * Purpose: Shared translations cho cả web và extension
 * 
 * Usage:
 * - Web: import { translations } from '@shared/i18n'
 * - Extension: load từ bundled JSON hoặc fetch từ API
 */

export const supportedLocales = ['en', 'vi', 'ja', 'ko', 'zh', 'th', 'id', 'es', 'fr'] as const;
export type SupportedLocale = typeof supportedLocales[number];
export const defaultLocale: SupportedLocale = 'en';

// Locale display names
export const localeNames: Record<SupportedLocale, { native: string; flag: string }> = {
    en: { native: 'English', flag: '🇺🇸' },
    vi: { native: 'Tiếng Việt', flag: '🇻🇳' },
    ja: { native: '日本語', flag: '🇯🇵' },
    ko: { native: '한국어', flag: '🇰🇷' },
    zh: { native: '中文', flag: '🇨🇳' },
    th: { native: 'ไทย', flag: '🇹🇭' },
    id: { native: 'Bahasa Indonesia', flag: '🇮🇩' },
    es: { native: 'Español', flag: '🇪🇸' },
    fr: { native: 'Français', flag: '🇫🇷' },
};

export interface TranslationStrings {
    common: {
        app_name: string;
        loading: string;
        error: string;
        success: string;
        cancel: string;
        save: string;
        delete: string;
        close: string;
        confirm: string;
        back: string;
        next: string;
        retry: string;
    };
    auth: {
        login: string;
        logout: string;
        login_with_google: string;
        login_to_continue: string;
        not_logged_in: string;
    };
    gems: {
        title: string;
        balance: string;
        buy_gems: string;
        gems_count: string;
        not_enough: string;
        purchase_success: string;
        purchase_failed: string;
        free_tries: string;
        tries_remaining: string;
        // Packages
        starter_pack: string;
        pro_pack: string;
        premium_pack: string;
        most_popular: string;
        best_value: string;
    };
    tryon: {
        title: string;
        your_photo: string;
        clothing: string;
        upload_photo: string;
        select_clothing: string;
        try_on_button: string;
        processing: string;
        result: string;
        try_again: string;
        save_outfit: string;
        no_photo: string;
        right_click_hint: string;
        paste_url: string;
        drag_drop: string;
    };
    extension: {
        sidebar_title: string;
        open_webapp: string;
        buy_more_gems: string;
        recent_clothing: string;
        saved_photos: string;
        clear_all: string;
        copy_image: string;
        download: string;
        share: string;
        open_product: string;
        rename: string;
        set_default: string;
        keyboard_shortcuts: string;
    };
    settings: {
        title: string;
        language: string;
        theme: string;
        dark: string;
        light: string;
        auto: string;
        notifications: string;
        sync: string;
    };
    errors: {
        generic: string;
        network: string;
        unauthorized: string;
        insufficient_gems: string;
        invalid_image: string;
        tryon_failed: string;
        payment_failed: string;
    };
}

export const translations: Record<SupportedLocale, TranslationStrings> = {
    en: {
        common: {
            app_name: 'Fitly',
            loading: 'Loading...',
            error: 'An error occurred',
            success: 'Success!',
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
            close: 'Close',
            confirm: 'Confirm',
            back: 'Back',
            next: 'Next',
            retry: 'Retry',
        },
        auth: {
            login: 'Login',
            logout: 'Logout',
            login_with_google: 'Continue with Google',
            login_to_continue: 'Login to save history and sync data',
            not_logged_in: 'Not logged in',
        },
        gems: {
            title: 'Gems',
            balance: 'Balance',
            buy_gems: 'Buy Gems',
            gems_count: '{count} gems',
            not_enough: 'Not enough gems',
            purchase_success: 'Purchase successful! Added {amount} gems.',
            purchase_failed: 'Purchase failed. Please try again.',
            free_tries: '{count} free tries remaining',
            tries_remaining: '{count} tries remaining',
            starter_pack: 'Starter',
            pro_pack: 'Pro',
            premium_pack: 'Premium',
            most_popular: 'Most Popular',
            best_value: 'Best Value',
        },
        tryon: {
            title: 'Virtual Try-On',
            your_photo: 'Your Photo',
            clothing: 'Clothing',
            upload_photo: 'Upload Photo',
            select_clothing: 'Select Clothing',
            try_on_button: 'Try On',
            processing: 'Creating your outfit...',
            result: 'Result',
            try_again: 'Try Another',
            save_outfit: 'Save Outfit',
            no_photo: 'No photo selected',
            right_click_hint: 'Right-click on clothing image to try',
            paste_url: 'Paste URL',
            drag_drop: 'Drag & drop image here',
        },
        extension: {
            sidebar_title: 'Virtual Try-On',
            open_webapp: 'Open Web App',
            buy_more_gems: 'Buy More Gems',
            recent_clothing: 'Recently Tried',
            saved_photos: 'Saved Photos',
            clear_all: 'Clear All',
            copy_image: 'Copy Image',
            download: 'Download',
            share: 'Share',
            open_product: 'Open Product Page',
            rename: 'Rename',
            set_default: 'Set as Default',
            keyboard_shortcuts: 'Keyboard Shortcuts',
        },
        settings: {
            title: 'Settings',
            language: 'Language',
            theme: 'Theme',
            dark: 'Dark',
            light: 'Light',
            auto: 'Auto',
            notifications: 'Notifications',
            sync: 'Sync',
        },
        errors: {
            generic: 'Something went wrong. Please try again.',
            network: 'Network error. Please check your connection.',
            unauthorized: 'Please login to continue.',
            insufficient_gems: 'Not enough gems. Please purchase more.',
            invalid_image: 'Invalid image. Please try another.',
            tryon_failed: 'Try-on failed. Gems have been refunded.',
            payment_failed: 'Payment failed. Please try again.',
        },
    },
    vi: {
        common: {
            app_name: 'Fitly',
            loading: 'Đang tải...',
            error: 'Có lỗi xảy ra',
            success: 'Thành công!',
            cancel: 'Hủy',
            save: 'Lưu',
            delete: 'Xóa',
            close: 'Đóng',
            confirm: 'Xác nhận',
            back: 'Quay lại',
            next: 'Tiếp',
            retry: 'Thử lại',
        },
        auth: {
            login: 'Đăng nhập',
            logout: 'Đăng xuất',
            login_with_google: 'Tiếp tục với Google',
            login_to_continue: 'Đăng nhập để lưu lịch sử và đồng bộ dữ liệu',
            not_logged_in: 'Chưa đăng nhập',
        },
        gems: {
            title: 'Gems',
            balance: 'Số dư',
            buy_gems: 'Mua Gems',
            gems_count: '{count} gems',
            not_enough: 'Không đủ gems',
            purchase_success: 'Mua thành công! Đã thêm {amount} gems.',
            purchase_failed: 'Mua thất bại. Vui lòng thử lại.',
            free_tries: 'Còn {count} lần thử miễn phí',
            tries_remaining: 'Còn {count} lần thử',
            starter_pack: 'Gói Khởi Đầu',
            pro_pack: 'Gói Pro',
            premium_pack: 'Gói Premium',
            most_popular: 'Phổ biến nhất',
            best_value: 'Tiết kiệm nhất',
        },
        tryon: {
            title: 'Thử Đồ Ảo',
            your_photo: 'Ảnh của bạn',
            clothing: 'Quần áo',
            upload_photo: 'Tải ảnh lên',
            select_clothing: 'Chọn quần áo',
            try_on_button: 'Thử đồ',
            processing: 'Đang tạo ảnh thử đồ...',
            result: 'Kết quả',
            try_again: 'Thử lại',
            save_outfit: 'Lưu outfit',
            no_photo: 'Chưa chọn ảnh',
            right_click_hint: 'Chuột phải vào ảnh quần áo để thử',
            paste_url: 'Dán URL',
            drag_drop: 'Kéo thả ảnh vào đây',
        },
        extension: {
            sidebar_title: 'Thử Đồ Ảo',
            open_webapp: 'Mở Web App',
            buy_more_gems: 'Mua Thêm Gems',
            recent_clothing: 'Đã thử gần đây',
            saved_photos: 'Ảnh đã lưu',
            clear_all: 'Xóa hết',
            copy_image: 'Copy ảnh',
            download: 'Tải về',
            share: 'Chia sẻ',
            open_product: 'Mở trang sản phẩm',
            rename: 'Đổi tên',
            set_default: 'Đặt mặc định',
            keyboard_shortcuts: 'Phím tắt',
        },
        settings: {
            title: 'Cài đặt',
            language: 'Ngôn ngữ',
            theme: 'Giao diện',
            dark: 'Tối',
            light: 'Sáng',
            auto: 'Tự động',
            notifications: 'Thông báo',
            sync: 'Đồng bộ',
        },
        errors: {
            generic: 'Có lỗi xảy ra. Vui lòng thử lại.',
            network: 'Lỗi mạng. Vui lòng kiểm tra kết nối.',
            unauthorized: 'Vui lòng đăng nhập để tiếp tục.',
            insufficient_gems: 'Không đủ gems. Vui lòng mua thêm.',
            invalid_image: 'Ảnh không hợp lệ. Vui lòng thử ảnh khác.',
            tryon_failed: 'Thử đồ thất bại. Gems đã được hoàn lại.',
            payment_failed: 'Thanh toán thất bại. Vui lòng thử lại.',
        },
    },
    ja: {
        common: {
            app_name: 'Fitly',
            loading: '読み込み中...',
            error: 'エラーが発生しました',
            success: '成功！',
            cancel: 'キャンセル',
            save: '保存',
            delete: '削除',
            close: '閉じる',
            confirm: '確認',
            back: '戻る',
            next: '次へ',
            retry: '再試行',
        },
        auth: {
            login: 'ログイン',
            logout: 'ログアウト',
            login_with_google: 'Googleで続行',
            login_to_continue: 'ログインして履歴を保存、データを同期',
            not_logged_in: 'ログインしていません',
        },
        gems: {
            title: 'ジェム',
            balance: '残高',
            buy_gems: 'ジェムを購入',
            gems_count: '{count} ジェム',
            not_enough: 'ジェムが不足しています',
            purchase_success: '購入完了！{amount}ジェムを追加しました。',
            purchase_failed: '購入に失敗しました。もう一度お試しください。',
            free_tries: '無料試着 残り{count}回',
            tries_remaining: '残り{count}回',
            starter_pack: 'スターター',
            pro_pack: 'プロ',
            premium_pack: 'プレミアム',
            most_popular: '人気No.1',
            best_value: 'お得',
        },
        tryon: {
            title: 'バーチャル試着',
            your_photo: 'あなたの写真',
            clothing: '服',
            upload_photo: '写真をアップロード',
            select_clothing: '服を選ぶ',
            try_on_button: '試着する',
            processing: 'コーディネートを作成中...',
            result: '結果',
            try_again: '別の服を試す',
            save_outfit: 'コーディネートを保存',
            no_photo: '写真が選択されていません',
            right_click_hint: '服の画像を右クリックして試着',
            paste_url: 'URLを貼り付け',
            drag_drop: 'ここに画像をドロップ',
        },
        extension: {
            sidebar_title: 'バーチャル試着',
            open_webapp: 'Webアプリを開く',
            buy_more_gems: 'ジェムを購入',
            recent_clothing: '最近試着した服',
            saved_photos: '保存した写真',
            clear_all: 'すべて削除',
            copy_image: '画像をコピー',
            download: 'ダウンロード',
            share: '共有',
            open_product: '商品ページを開く',
            rename: '名前を変更',
            set_default: 'デフォルトに設定',
            keyboard_shortcuts: 'ショートカットキー',
        },
        settings: {
            title: '設定',
            language: '言語',
            theme: 'テーマ',
            dark: 'ダーク',
            light: 'ライト',
            auto: '自動',
            notifications: '通知',
            sync: '同期',
        },
        errors: {
            generic: 'エラーが発生しました。もう一度お試しください。',
            network: 'ネットワークエラー。接続を確認してください。',
            unauthorized: 'ログインしてください。',
            insufficient_gems: 'ジェムが不足しています。購入してください。',
            invalid_image: '無効な画像です。別の画像をお試しください。',
            tryon_failed: '試着に失敗しました。ジェムは返金されました。',
            payment_failed: '支払いに失敗しました。もう一度お試しください。',
        },
    },
    ko: {
        common: {
            app_name: 'Fitly',
            loading: '로딩 중...',
            error: '오류가 발생했습니다',
            success: '성공!',
            cancel: '취소',
            save: '저장',
            delete: '삭제',
            close: '닫기',
            confirm: '확인',
            back: '뒤로',
            next: '다음',
            retry: '재시도',
        },
        auth: {
            login: '로그인',
            logout: '로그아웃',
            login_with_google: 'Google로 계속',
            login_to_continue: '로그인하여 기록 저장 및 데이터 동기화',
            not_logged_in: '로그인하지 않음',
        },
        gems: {
            title: '젬',
            balance: '잔액',
            buy_gems: '젬 구매',
            gems_count: '{count} 젬',
            not_enough: '젬이 부족합니다',
            purchase_success: '구매 완료! {amount}젬이 추가되었습니다.',
            purchase_failed: '구매 실패. 다시 시도해주세요.',
            free_tries: '무료 피팅 {count}회 남음',
            tries_remaining: '{count}회 남음',
            starter_pack: '스타터',
            pro_pack: '프로',
            premium_pack: '프리미엄',
            most_popular: '인기',
            best_value: '베스트',
        },
        tryon: {
            title: '가상 피팅',
            your_photo: '내 사진',
            clothing: '옷',
            upload_photo: '사진 업로드',
            select_clothing: '옷 선택',
            try_on_button: '피팅하기',
            processing: '코디를 만드는 중...',
            result: '결과',
            try_again: '다시 시도',
            save_outfit: '코디 저장',
            no_photo: '사진이 선택되지 않았습니다',
            right_click_hint: '옷 이미지를 우클릭하여 피팅',
            paste_url: 'URL 붙여넣기',
            drag_drop: '여기에 이미지를 드롭하세요',
        },
        extension: {
            sidebar_title: '가상 피팅',
            open_webapp: '웹앱 열기',
            buy_more_gems: '젬 구매',
            recent_clothing: '최근 피팅',
            saved_photos: '저장된 사진',
            clear_all: '모두 삭제',
            copy_image: '이미지 복사',
            download: '다운로드',
            share: '공유',
            open_product: '상품 페이지 열기',
            rename: '이름 변경',
            set_default: '기본값으로 설정',
            keyboard_shortcuts: '단축키',
        },
        settings: {
            title: '설정',
            language: '언어',
            theme: '테마',
            dark: '다크',
            light: '라이트',
            auto: '자동',
            notifications: '알림',
            sync: '동기화',
        },
        errors: {
            generic: '오류가 발생했습니다. 다시 시도해주세요.',
            network: '네트워크 오류. 연결을 확인해주세요.',
            unauthorized: '로그인이 필요합니다.',
            insufficient_gems: '젬이 부족합니다. 구매해주세요.',
            invalid_image: '유효하지 않은 이미지입니다. 다른 이미지를 시도해주세요.',
            tryon_failed: '피팅 실패. 젬이 환불되었습니다.',
            payment_failed: '결제 실패. 다시 시도해주세요.',
        },
    },
    zh: {
        common: {
            app_name: 'Fitly',
            loading: '加载中...',
            error: '发生错误',
            success: '成功！',
            cancel: '取消',
            save: '保存',
            delete: '删除',
            close: '关闭',
            confirm: '确认',
            back: '返回',
            next: '下一步',
            retry: '重试',
        },
        auth: {
            login: '登录',
            logout: '退出',
            login_with_google: '使用Google登录',
            login_to_continue: '登录以保存历史记录和同步数据',
            not_logged_in: '未登录',
        },
        gems: {
            title: '宝石',
            balance: '余额',
            buy_gems: '购买宝石',
            gems_count: '{count} 宝石',
            not_enough: '宝石不足',
            purchase_success: '购买成功！已添加 {amount} 宝石。',
            purchase_failed: '购买失败，请重试。',
            free_tries: '剩余 {count} 次免费试穿',
            tries_remaining: '剩余 {count} 次',
            starter_pack: '入门版',
            pro_pack: '专业版',
            premium_pack: '高级版',
            most_popular: '最受欢迎',
            best_value: '超值',
        },
        tryon: {
            title: '虚拟试穿',
            your_photo: '你的照片',
            clothing: '服装',
            upload_photo: '上传照片',
            select_clothing: '选择服装',
            try_on_button: '试穿',
            processing: '正在生成搭配...',
            result: '结果',
            try_again: '再试一次',
            save_outfit: '保存搭配',
            no_photo: '未选择照片',
            right_click_hint: '右键点击服装图片进行试穿',
            paste_url: '粘贴链接',
            drag_drop: '拖放图片到这里',
        },
        extension: {
            sidebar_title: '虚拟试穿',
            open_webapp: '打开网页版',
            buy_more_gems: '购买宝石',
            recent_clothing: '最近试穿',
            saved_photos: '已保存的照片',
            clear_all: '清空',
            copy_image: '复制图片',
            download: '下载',
            share: '分享',
            open_product: '打开商品页',
            rename: '重命名',
            set_default: '设为默认',
            keyboard_shortcuts: '快捷键',
        },
        settings: {
            title: '设置',
            language: '语言',
            theme: '主题',
            dark: '深色',
            light: '浅色',
            auto: '自动',
            notifications: '通知',
            sync: '同步',
        },
        errors: {
            generic: '出现错误，请重试。',
            network: '网络错误，请检查连接。',
            unauthorized: '请登录后继续。',
            insufficient_gems: '宝石不足，请购买。',
            invalid_image: '图片无效，请尝试其他图片。',
            tryon_failed: '试穿失败，宝石已退还。',
            payment_failed: '支付失败，请重试。',
        },
    },
    th: {
        common: {
            app_name: 'Fitly',
            loading: 'กำลังโหลด...',
            error: 'เกิดข้อผิดพลาด',
            success: 'สำเร็จ!',
            cancel: 'ยกเลิก',
            save: 'บันทึก',
            delete: 'ลบ',
            close: 'ปิด',
            confirm: 'ยืนยัน',
            back: 'กลับ',
            next: 'ถัดไป',
            retry: 'ลองใหม่',
        },
        auth: {
            login: 'เข้าสู่ระบบ',
            logout: 'ออกจากระบบ',
            login_with_google: 'ดำเนินการด้วย Google',
            login_to_continue: 'เข้าสู่ระบบเพื่อบันทึกประวัติและซิงค์ข้อมูล',
            not_logged_in: 'ยังไม่ได้เข้าสู่ระบบ',
        },
        gems: {
            title: 'เพชร',
            balance: 'ยอดคงเหลือ',
            buy_gems: 'ซื้อเพชร',
            gems_count: '{count} เพชร',
            not_enough: 'เพชรไม่เพียงพอ',
            purchase_success: 'ซื้อสำเร็จ! เพิ่ม {amount} เพชร',
            purchase_failed: 'ซื้อไม่สำเร็จ กรุณาลองใหม่',
            free_tries: 'ทดลองฟรีเหลือ {count} ครั้ง',
            tries_remaining: 'เหลือ {count} ครั้ง',
            starter_pack: 'เริ่มต้น',
            pro_pack: 'โปร',
            premium_pack: 'พรีเมียม',
            most_popular: 'ยอดนิยม',
            best_value: 'คุ้มสุด',
        },
        tryon: {
            title: 'ลองเสื้อผ้าเสมือน',
            your_photo: 'รูปของคุณ',
            clothing: 'เสื้อผ้า',
            upload_photo: 'อัปโหลดรูป',
            select_clothing: 'เลือกเสื้อผ้า',
            try_on_button: 'ลองสวม',
            processing: 'กำลังสร้างชุด...',
            result: 'ผลลัพธ์',
            try_again: 'ลองใหม่',
            save_outfit: 'บันทึกชุด',
            no_photo: 'ยังไม่ได้เลือกรูป',
            right_click_hint: 'คลิกขวาที่รูปเสื้อผ้าเพื่อลอง',
            paste_url: 'วาง URL',
            drag_drop: 'ลากและวางรูปที่นี่',
        },
        extension: {
            sidebar_title: 'ลองเสื้อผ้าเสมือน',
            open_webapp: 'เปิดเว็บแอป',
            buy_more_gems: 'ซื้อเพชรเพิ่ม',
            recent_clothing: 'ลองล่าสุด',
            saved_photos: 'รูปที่บันทึก',
            clear_all: 'ลบทั้งหมด',
            copy_image: 'คัดลอกรูป',
            download: 'ดาวน์โหลด',
            share: 'แชร์',
            open_product: 'เปิดหน้าสินค้า',
            rename: 'เปลี่ยนชื่อ',
            set_default: 'ตั้งเป็นค่าเริ่มต้น',
            keyboard_shortcuts: 'ปุ่มลัด',
        },
        settings: {
            title: 'การตั้งค่า',
            language: 'ภาษา',
            theme: 'ธีม',
            dark: 'มืด',
            light: 'สว่าง',
            auto: 'อัตโนมัติ',
            notifications: 'การแจ้งเตือน',
            sync: 'ซิงค์',
        },
        errors: {
            generic: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
            network: 'ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ',
            unauthorized: 'กรุณาเข้าสู่ระบบ',
            insufficient_gems: 'เพชรไม่เพียงพอ กรุณาซื้อเพิ่ม',
            invalid_image: 'รูปไม่ถูกต้อง กรุณาลองรูปอื่น',
            tryon_failed: 'ลองไม่สำเร็จ เพชรถูกคืนแล้ว',
            payment_failed: 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่',
        },
    },
    id: {
        common: {
            app_name: 'Fitly',
            loading: 'Memuat...',
            error: 'Terjadi kesalahan',
            success: 'Berhasil!',
            cancel: 'Batal',
            save: 'Simpan',
            delete: 'Hapus',
            close: 'Tutup',
            confirm: 'Konfirmasi',
            back: 'Kembali',
            next: 'Lanjut',
            retry: 'Coba lagi',
        },
        auth: {
            login: 'Masuk',
            logout: 'Keluar',
            login_with_google: 'Lanjutkan dengan Google',
            login_to_continue: 'Masuk untuk menyimpan riwayat dan sinkronisasi data',
            not_logged_in: 'Belum masuk',
        },
        gems: {
            title: 'Gem',
            balance: 'Saldo',
            buy_gems: 'Beli Gem',
            gems_count: '{count} gem',
            not_enough: 'Gem tidak cukup',
            purchase_success: 'Pembelian berhasil! Ditambahkan {amount} gem.',
            purchase_failed: 'Pembelian gagal. Silakan coba lagi.',
            free_tries: 'Sisa {count} percobaan gratis',
            tries_remaining: 'Sisa {count} percobaan',
            starter_pack: 'Pemula',
            pro_pack: 'Pro',
            premium_pack: 'Premium',
            most_popular: 'Terpopuler',
            best_value: 'Terbaik',
        },
        tryon: {
            title: 'Coba Pakaian Virtual',
            your_photo: 'Foto Anda',
            clothing: 'Pakaian',
            upload_photo: 'Unggah Foto',
            select_clothing: 'Pilih Pakaian',
            try_on_button: 'Coba Pakai',
            processing: 'Membuat outfit Anda...',
            result: 'Hasil',
            try_again: 'Coba Lagi',
            save_outfit: 'Simpan Outfit',
            no_photo: 'Belum ada foto',
            right_click_hint: 'Klik kanan pada gambar pakaian untuk mencoba',
            paste_url: 'Tempel URL',
            drag_drop: 'Seret & lepas gambar di sini',
        },
        extension: {
            sidebar_title: 'Coba Pakaian Virtual',
            open_webapp: 'Buka Web App',
            buy_more_gems: 'Beli Lebih Banyak Gem',
            recent_clothing: 'Baru Dicoba',
            saved_photos: 'Foto Tersimpan',
            clear_all: 'Hapus Semua',
            copy_image: 'Salin Gambar',
            download: 'Unduh',
            share: 'Bagikan',
            open_product: 'Buka Halaman Produk',
            rename: 'Ganti Nama',
            set_default: 'Atur Sebagai Default',
            keyboard_shortcuts: 'Pintasan Keyboard',
        },
        settings: {
            title: 'Pengaturan',
            language: 'Bahasa',
            theme: 'Tema',
            dark: 'Gelap',
            light: 'Terang',
            auto: 'Otomatis',
            notifications: 'Notifikasi',
            sync: 'Sinkronisasi',
        },
        errors: {
            generic: 'Terjadi kesalahan. Silakan coba lagi.',
            network: 'Kesalahan jaringan. Periksa koneksi Anda.',
            unauthorized: 'Silakan masuk untuk melanjutkan.',
            insufficient_gems: 'Gem tidak cukup. Silakan beli lebih banyak.',
            invalid_image: 'Gambar tidak valid. Coba gambar lain.',
            tryon_failed: 'Gagal mencoba. Gem telah dikembalikan.',
            payment_failed: 'Pembayaran gagal. Silakan coba lagi.',
        },
    },
    es: {
        common: {
            app_name: 'Fitly',
            loading: 'Cargando...',
            error: 'Ocurrió un error',
            success: '¡Éxito!',
            cancel: 'Cancelar',
            save: 'Guardar',
            delete: 'Eliminar',
            close: 'Cerrar',
            confirm: 'Confirmar',
            back: 'Atrás',
            next: 'Siguiente',
            retry: 'Reintentar',
        },
        auth: {
            login: 'Iniciar sesión',
            logout: 'Cerrar sesión',
            login_with_google: 'Continuar con Google',
            login_to_continue: 'Inicia sesión para guardar historial y sincronizar datos',
            not_logged_in: 'No has iniciado sesión',
        },
        gems: {
            title: 'Gemas',
            balance: 'Saldo',
            buy_gems: 'Comprar Gemas',
            gems_count: '{count} gemas',
            not_enough: 'Gemas insuficientes',
            purchase_success: '¡Compra exitosa! Se agregaron {amount} gemas.',
            purchase_failed: 'Compra fallida. Por favor, inténtalo de nuevo.',
            free_tries: '{count} pruebas gratis restantes',
            tries_remaining: '{count} pruebas restantes',
            starter_pack: 'Inicial',
            pro_pack: 'Pro',
            premium_pack: 'Premium',
            most_popular: 'Más Popular',
            best_value: 'Mejor Valor',
        },
        tryon: {
            title: 'Probador Virtual',
            your_photo: 'Tu Foto',
            clothing: 'Ropa',
            upload_photo: 'Subir Foto',
            select_clothing: 'Seleccionar Ropa',
            try_on_button: 'Probar',
            processing: 'Creando tu outfit...',
            result: 'Resultado',
            try_again: 'Intentar Otro',
            save_outfit: 'Guardar Outfit',
            no_photo: 'No hay foto seleccionada',
            right_click_hint: 'Haz clic derecho en la imagen de ropa para probar',
            paste_url: 'Pegar URL',
            drag_drop: 'Arrastra y suelta la imagen aquí',
        },
        extension: {
            sidebar_title: 'Probador Virtual',
            open_webapp: 'Abrir Web App',
            buy_more_gems: 'Comprar Más Gemas',
            recent_clothing: 'Probado Recientemente',
            saved_photos: 'Fotos Guardadas',
            clear_all: 'Borrar Todo',
            copy_image: 'Copiar Imagen',
            download: 'Descargar',
            share: 'Compartir',
            open_product: 'Abrir Página del Producto',
            rename: 'Renombrar',
            set_default: 'Establecer como Predeterminado',
            keyboard_shortcuts: 'Atajos de Teclado',
        },
        settings: {
            title: 'Configuración',
            language: 'Idioma',
            theme: 'Tema',
            dark: 'Oscuro',
            light: 'Claro',
            auto: 'Automático',
            notifications: 'Notificaciones',
            sync: 'Sincronización',
        },
        errors: {
            generic: 'Algo salió mal. Por favor, inténtalo de nuevo.',
            network: 'Error de red. Verifica tu conexión.',
            unauthorized: 'Por favor, inicia sesión para continuar.',
            insufficient_gems: 'Gemas insuficientes. Por favor, compra más.',
            invalid_image: 'Imagen no válida. Intenta con otra.',
            tryon_failed: 'Prueba fallida. Las gemas han sido reembolsadas.',
            payment_failed: 'Pago fallido. Por favor, inténtalo de nuevo.',
        },
    },
    fr: {
        common: {
            app_name: 'Fitly',
            loading: 'Chargement...',
            error: 'Une erreur est survenue',
            success: 'Succès !',
            cancel: 'Annuler',
            save: 'Enregistrer',
            delete: 'Supprimer',
            close: 'Fermer',
            confirm: 'Confirmer',
            back: 'Retour',
            next: 'Suivant',
            retry: 'Réessayer',
        },
        auth: {
            login: 'Connexion',
            logout: 'Déconnexion',
            login_with_google: 'Continuer avec Google',
            login_to_continue: 'Connectez-vous pour sauvegarder l\'historique et synchroniser les données',
            not_logged_in: 'Non connecté',
        },
        gems: {
            title: 'Gemmes',
            balance: 'Solde',
            buy_gems: 'Acheter des Gemmes',
            gems_count: '{count} gemmes',
            not_enough: 'Gemmes insuffisantes',
            purchase_success: 'Achat réussi ! {amount} gemmes ajoutées.',
            purchase_failed: 'Échec de l\'achat. Veuillez réessayer.',
            free_tries: '{count} essais gratuits restants',
            tries_remaining: '{count} essais restants',
            starter_pack: 'Débutant',
            pro_pack: 'Pro',
            premium_pack: 'Premium',
            most_popular: 'Plus Populaire',
            best_value: 'Meilleur Rapport',
        },
        tryon: {
            title: 'Essayage Virtuel',
            your_photo: 'Votre Photo',
            clothing: 'Vêtement',
            upload_photo: 'Télécharger Photo',
            select_clothing: 'Sélectionner Vêtement',
            try_on_button: 'Essayer',
            processing: 'Création de votre tenue...',
            result: 'Résultat',
            try_again: 'Réessayer',
            save_outfit: 'Sauvegarder la Tenue',
            no_photo: 'Aucune photo sélectionnée',
            right_click_hint: 'Clic droit sur l\'image du vêtement pour essayer',
            paste_url: 'Coller URL',
            drag_drop: 'Glisser-déposer l\'image ici',
        },
        extension: {
            sidebar_title: 'Essayage Virtuel',
            open_webapp: 'Ouvrir l\'Application Web',
            buy_more_gems: 'Acheter Plus de Gemmes',
            recent_clothing: 'Essayés Récemment',
            saved_photos: 'Photos Enregistrées',
            clear_all: 'Tout Effacer',
            copy_image: 'Copier l\'Image',
            download: 'Télécharger',
            share: 'Partager',
            open_product: 'Ouvrir la Page Produit',
            rename: 'Renommer',
            set_default: 'Définir par Défaut',
            keyboard_shortcuts: 'Raccourcis Clavier',
        },
        settings: {
            title: 'Paramètres',
            language: 'Langue',
            theme: 'Thème',
            dark: 'Sombre',
            light: 'Clair',
            auto: 'Automatique',
            notifications: 'Notifications',
            sync: 'Synchronisation',
        },
        errors: {
            generic: 'Une erreur est survenue. Veuillez réessayer.',
            network: 'Erreur réseau. Vérifiez votre connexion.',
            unauthorized: 'Veuillez vous connecter pour continuer.',
            insufficient_gems: 'Gemmes insuffisantes. Veuillez en acheter.',
            invalid_image: 'Image non valide. Essayez une autre image.',
            tryon_failed: 'Essayage échoué. Les gemmes ont été remboursées.',
            payment_failed: 'Paiement échoué. Veuillez réessayer.',
        },
    },
};

/**
 * Get translation function for a specific locale
 */
export function getTranslations(locale: SupportedLocale): TranslationStrings {
    return translations[locale] || translations[defaultLocale];
}

/**
 * Interpolate variables into translation string
 * Usage: t('gems.gems_count', { count: 50 }) => "50 gems"
 */
export function interpolate(str: string, vars: Record<string, string | number>): string {
    return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] || ''));
}

/**
 * Get browser/system locale
 */
export function detectLocale(): SupportedLocale {
    if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language?.split('-')[0];
        if (supportedLocales.includes(browserLang as SupportedLocale)) {
            return browserLang as SupportedLocale;
        }
    }
    return defaultLocale;
}
