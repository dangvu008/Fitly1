/**
 * File: i18n.js
 * Purpose: Hệ thống đa ngôn ngữ và định dạng tiền tệ cho extension
 * 
 * Features:
 * - Translations đầy đủ cho 9 ngôn ngữ
 * - Currency formatting theo locale
 * - Đồng bộ với web app
 * 
 * Usage: All exports are available via window.i18n object
 * Example: window.i18n.t('hello', 'vi')
 */

// IIFE to avoid polluting global scope but expose via window.i18n
(function () {

    // =====================================================
    // SUPPORTED LOCALES
    // =====================================================

    const SUPPORTED_LOCALES = ['en', 'vi', 'ja', 'ko', 'zh', 'th', 'id', 'es', 'fr'];
    const DEFAULT_LOCALE = 'vi';

    // =====================================================
    // LOCALE INFO (for display)
    // =====================================================

    const LOCALE_INFO = {
        en: { native: 'English', flag: '🇺🇸', english: 'English' },
        vi: { native: 'Tiếng Việt', flag: '🇻🇳', english: 'Vietnamese' },
        ja: { native: '日本語', flag: '🇯🇵', english: 'Japanese' },
        ko: { native: '한국어', flag: '🇰🇷', english: 'Korean' },
        zh: { native: '中文', flag: '🇨🇳', english: 'Chinese' },
        th: { native: 'ไทย', flag: '🇹🇭', english: 'Thai' },
        id: { native: 'Bahasa Indonesia', flag: '🇮🇩', english: 'Indonesian' },
        es: { native: 'Español', flag: '🇪🇸', english: 'Spanish' },
        fr: { native: 'Français', flag: '🇫🇷', english: 'French' },
    };

    // =====================================================
    // CURRENCY CONFIG (by locale)
    // =====================================================

    const CURRENCY_CONFIG = {
        en: { code: 'USD', symbol: '$', position: 'before', decimals: 2, separator: ',', decimal: '.' },
        vi: { code: 'VND', symbol: '₫', position: 'after', decimals: 0, separator: '.', decimal: ',' },
        ja: { code: 'JPY', symbol: '¥', position: 'before', decimals: 0, separator: ',', decimal: '.' },
        ko: { code: 'KRW', symbol: '₩', position: 'before', decimals: 0, separator: ',', decimal: '.' },
        zh: { code: 'CNY', symbol: '¥', position: 'before', decimals: 2, separator: ',', decimal: '.' },
        th: { code: 'THB', symbol: '฿', position: 'before', decimals: 2, separator: ',', decimal: '.' },
        id: { code: 'IDR', symbol: 'Rp', position: 'before', decimals: 0, separator: '.', decimal: ',' },
        es: { code: 'EUR', symbol: '€', position: 'after', decimals: 2, separator: '.', decimal: ',' },
        fr: { code: 'EUR', symbol: '€', position: 'after', decimals: 2, separator: ' ', decimal: ',' },
    };

    // =====================================================
    // TRANSLATIONS
    // =====================================================

    const TRANSLATIONS = {
        en: {
            // Header
            gems: 'gems',
            balance: 'Balance',
            buy_gems: 'Buy Gems',

            // Sections
            your_photo: 'Your Photo',
            upload_photo: 'Upload',
            select_below: 'Select from below or upload',
            saved_photos: 'Saved Photos',
            clothing: 'Clothing',
            try_on_result: 'Try-on Result',
            paste_url: 'Paste URL',
            right_click_hint: 'Right-click on clothing image on web to try',
            recent_clothing: 'Recently Tried',
            clear_all: 'Clear All',

            // Actions
            try_on_button: 'Try On Now',
            tries_remaining: 'tries remaining',
            need_more_gems: 'Need more gems',
            results: 'Results',
            no_results: 'No results yet. Try on clothes to see results here.',
            copy_image: 'Copy image',
            open_product: 'Open product page',
            rename: 'Rename',
            delete: 'Delete',
            save_outfit: 'Save outfit',
            download: 'Download',
            share: 'Share',

            // Loading
            processing: 'Creating your outfit...',
            loading_tip: 'AI is analyzing millions of pixels to create the perfect result!',
            finding_style: 'Finding the perfect fit...',
            ai_working: 'AI stylist is working magic...',
            almost_done: 'Almost there, looking fabulous!',
            creating_look: 'Creating your look...',
            mixing_colors: 'Mixing colors beautifully...',

            // Success/Error
            success: 'Try-on successful!',
            error_generic: 'Something went wrong. Please try again.',
            error_insufficient_gems: 'Not enough gems. Please purchase more.',
            error_network: 'Network error. Please check your connection.',

            // Auth
            login_to_try: 'Login to try clothes and save outfits',
            continue_google: 'Continue with Google',
            not_logged_in: 'Not logged in',

            // Settings
            language: 'Language',
            shortcuts: 'Shortcuts',
            changed_to: 'Changed to English',
            theme: 'Theme',
            dark: 'Dark',
            light: 'Light',

            // Gems packages
            starter_pack: 'Starter Pack',
            pro_pack: 'Pro Pack',
            premium_pack: 'Premium Pack',
            popular: 'Popular',
            best_value: 'Best Value',
            payment_note: 'Secure payment via Stripe on web app',

            // User models
            my_photos: 'My Photos',
            add_photo: 'Add Photo',
            set_default: 'Set as default',
            photo_added: 'Photo added',
            photo_deleted: 'Photo deleted',
            default_set: 'Set as default photo',

            // Clothing history
            clothing_selected: 'Clothing selected',
            clothing_saved: 'Saved to collection!',
            quick_try: 'Quick try',
            has_product_link: 'Has product link',

            // Popups
            popup_opened: 'Popup opened',
            popup_closed: 'Popup closed',
            result_saved: 'Result saved!',
            copied_to_clipboard: 'Copied! Paste to Zalo, Messenger...',
            could_not_copy: 'Could not copy',

            // Time
            just_now: 'Just now',
            minutes_ago: '{count} minutes ago',
            hours_ago: '{count} hours ago',
            days_ago: '{count} days ago',
            weeks_ago: '{count} weeks ago',
            months_ago: '{count} months ago',

            // Profile Menu
            open_fitly_web: 'Open Fitly Web',
            my_wardrobe: 'My Wardrobe',
            cache_management: 'Cache Storage',
            help: 'Help',
            logout: 'Logout',
            guest: 'Guest',
            not_signed_in: 'Not signed in',
            logged_out: 'Logged out',
            cache_cleared: 'Cache cleared',
            cache_info: 'Cache: {count} images ({size} MB)\n\nDo you want to clear all cache?',

            // Toast messages
            photo_selected: 'Photo selected',
            photo_delete_error: 'Error deleting photo',
            error_short: 'Error',
            image_from_context_with_link: 'Image captured from context menu (has original link)',
            image_from_context: 'Image captured from context menu',
            saved_to_collection: 'Saved to collection!',
            save_error: 'Error saving',
            trying_on: '✨ Trying on...',
            not_enough_gems: '💎 Not enough gems',
            select_photo_first: '⚠️ Select your photo first',
            history_cleared: 'History cleared',
            no_image_to_download: 'No image to download',
            image_downloaded: '✅ Image downloaded!',
            no_image_to_copy: 'No image to copy',
            image_copied: '📋 Image copied to clipboard!',
            link_copied: '📋 Link copied!',
            cannot_copy: 'Cannot copy',
            no_image_to_save: 'No image to save',
            saved_to_wardrobe: '✅ Saved to wardrobe!',
            error_occurred: 'An error occurred',
            shared_success: '✅ Shared!',
            product_link_copied: '📋 Product link copied!',
            cannot_share: 'Cannot share',
            no_image: 'No image',
            saving_as_model: '⏳ Saving as new model photo...',
            model_saved: '✅ Result used as new model photo!',
            enter_edit_prompt: '⚠️ Please enter edit instructions',
            no_image_to_edit: '⚠️ No image to edit',
            editing_image: '⏳ Editing image...',
            edit_success: '✅ Edit successful!',
            edit_error: '❌ Edit error',
            refund_success: '✅ Gems refunded! Sorry for the incorrect result 💎',
            result_deleted: 'Result deleted',
            all_results_deleted: 'All results deleted',
            cannot_open_popup: 'Cannot open popup on this page',
            no_product_link: 'No product link',
            opening_product: 'Opening product page...',
            copying_image: '🔄 Copying image...',
            downloading: 'Downloading...',
            demo_mode_hint: 'Demo mode: You have 3 free tries!',
            uploaded_image: 'Uploaded image',
            local_upload: 'Uploaded',

            // Upload & Drag/Drop
            image_too_large: 'Image too large (max 10MB)',
            select_image_file: 'Please select an image file',
            photo_added_success: 'Photo added',
            clothing_removed: 'Clothing image removed',
            drop_image_file: 'Please drop an image file',
            model_photo_added: '✅ Your photo added!',
            clothing_photo_added: '✅ Clothing image added!',
            press_t_to_try: '💡 Press T or Enter to try on',
            cannot_read_image: 'Cannot read image',
            invalid_url: 'Invalid URL. Must start with http:// or https://',
            invalid_url_short: 'Invalid URL',
            checking_image: '🔄 Checking image...',
            image_added_success: '✅ Image added successfully!',
            image_added_warning: 'Image added. If not displayed, try saving it locally.',
            click_clothing_hint: 'Click on a clothing image on the page',
            select_all_images: 'Please select all required images',
            running_simulation: '🧪 Running simulation mode...',
            tryon_success_popup: 'Try-on successful! Popup opened.',
            processing_error: 'Error during processing',
            clothing_photo_selected: 'Clothing image selected',
            opening_checkout: '🛒 Opening checkout page...',
            cannot_download: 'Cannot download',
            outfit_saved: 'Outfit saved!',
            outfit_save_error: 'Error saving outfit',
            demo_mode_toast: 'Demo mode: You have {count} free tries!',
            cannot_enable_demo: 'Cannot enable demo mode',
            report_wrong_btn: 'Wrong? Refund 💎',
            report_done_btn: '✓ Gem refunded',
            logout_error: 'Error logging out',
        },

        vi: {
            // Header
            gems: 'gems',
            balance: 'Số dư',
            buy_gems: 'Mua Gems',

            // Sections
            your_photo: 'Ảnh toàn thân',
            upload_photo: 'Tải ảnh',
            select_below: 'Chọn ảnh bên dưới hoặc tải lên',
            saved_photos: 'Ảnh đã lưu',
            clothing: 'Quần áo',
            try_on_result: 'Kết quả thử đồ',
            paste_url: 'Dán URL',
            right_click_hint: 'Chuột phải vào ảnh quần áo trên web để thử',
            recent_clothing: 'Đã thử gần đây',
            clear_all: 'Xóa hết',

            // Actions
            try_on_button: 'Thử đồ ngay',
            tries_remaining: 'lần thử',
            need_more_gems: 'Cần thêm gems',
            results: 'Kết quả',
            no_results: 'Chưa có kết quả. Thử đồ để xem kết quả ở đây.',
            copy_image: 'Copy ảnh',
            open_product: 'Mở trang sản phẩm',
            rename: 'Đổi tên',
            delete: 'Xóa',
            save_outfit: 'Lưu outfit',
            download: 'Tải về',
            share: 'Chia sẻ',

            // Loading
            processing: 'Đang tạo ảnh thử đồ...',
            loading_tip: 'AI đang phân tích hàng triệu pixels để tạo kết quả hoàn hảo!',
            finding_style: 'Đang tìm phong cách hoàn hảo...',
            ai_working: 'AI stylist đang làm phép...',
            almost_done: 'Sắp xong rồi, đẹp lắm!',
            creating_look: 'Đang tạo look cho bạn...',
            mixing_colors: 'Đang phối màu thật đẹp...',

            // Success/Error
            success: 'Thử đồ thành công!',
            error_generic: 'Có lỗi xảy ra. Vui lòng thử lại.',
            error_insufficient_gems: 'Không đủ gems. Vui lòng mua thêm.',
            error_network: 'Lỗi mạng. Vui lòng kiểm tra kết nối.',

            // Auth
            login_to_try: 'Đăng nhập để thử đồ và lưu outfit',
            continue_google: 'Tiếp tục với Google',
            not_logged_in: 'Chưa đăng nhập',

            // Settings
            language: 'Ngôn ngữ',
            shortcuts: 'Phím tắt',
            changed_to: 'Đã đổi sang Tiếng Việt',
            theme: 'Giao diện',
            dark: 'Tối',
            light: 'Sáng',

            // Gems packages
            starter_pack: 'Gói Khởi Đầu',
            pro_pack: 'Gói Pro',
            premium_pack: 'Gói Premium',
            popular: 'Phổ biến',
            best_value: 'Tiết kiệm nhất',
            payment_note: 'Thanh toán an toàn qua Stripe trên web app',

            // User models
            my_photos: 'Ảnh của tôi',
            add_photo: 'Thêm ảnh',
            set_default: 'Đặt mặc định',
            photo_added: 'Đã thêm ảnh',
            photo_deleted: 'Đã xóa ảnh',
            default_set: 'Đã đặt làm ảnh mặc định',

            // Clothing history
            clothing_selected: 'Đã chọn quần áo',
            clothing_saved: 'Đã lưu vào bộ sưu tập!',
            quick_try: 'Thử nhanh',
            has_product_link: 'Có link sản phẩm',

            // Popups
            popup_opened: 'Đã mở popup',
            popup_closed: 'Đã đóng popup',
            result_saved: 'Đã lưu kết quả!',
            copied_to_clipboard: 'Đã copy! Paste vào Zalo, Messenger...',
            could_not_copy: 'Không thể copy',

            // Time
            just_now: 'Vừa xong',
            minutes_ago: '{count} phút trước',
            hours_ago: '{count} giờ trước',
            days_ago: '{count} ngày trước',
            weeks_ago: '{count} tuần trước',
            months_ago: '{count} tháng trước',

            // Profile Menu
            open_fitly_web: 'Mở Fitly Web',
            my_wardrobe: 'Tủ đồ của tôi',
            cache_management: 'Quản lý bộ nhớ',
            help: 'Trợ giúp',
            logout: 'Đăng xuất',
            guest: 'Khách',
            not_signed_in: 'Chưa đăng nhập',
            logged_out: 'Đã đăng xuất',
            cache_cleared: 'Đã xóa bộ nhớ cache',
            cache_info: 'Bộ nhớ cache: {count} ảnh ({size} MB)\n\nBạn có muốn xóa toàn bộ cache không?',

            // Toast messages
            photo_selected: 'Đã chọn ảnh',
            photo_delete_error: 'Lỗi khi xóa',
            error_short: 'Lỗi',
            image_from_context_with_link: 'Đã tải ảnh từ context menu (có link gốc)',
            image_from_context: 'Đã tải ảnh từ context menu',
            saved_to_collection: 'Đã lưu vào bộ sưu tập!',
            save_error: 'Lỗi khi lưu',
            trying_on: '✨ Đang thử đồ...',
            not_enough_gems: '💎 Không đủ gems để thử',
            select_photo_first: '⚠️ Chọn ảnh của bạn trước',
            history_cleared: 'Đã xóa lịch sử',
            no_image_to_download: 'Không có ảnh để tải',
            image_downloaded: '✅ Đã tải ảnh về!',
            no_image_to_copy: 'Không có ảnh để copy',
            image_copied: '📋 Đã copy ảnh vào clipboard!',
            link_copied: '📋 Đã copy link ảnh!',
            cannot_copy: 'Không thể copy',
            no_image_to_save: 'Không có ảnh để lưu',
            saved_to_wardrobe: '✅ Đã lưu vào tủ đồ!',
            error_occurred: 'Có lỗi xảy ra',
            shared_success: '✅ Đã chia sẻ!',
            product_link_copied: '📋 Đã copy link sản phẩm!',
            cannot_share: 'Không thể chia sẻ',
            no_image: 'Không có ảnh',
            saving_as_model: '⏳ Đang lưu ảnh mẫu mới...',
            model_saved: '✅ Đã dùng kết quả làm ảnh mẫu mới!',
            enter_edit_prompt: '⚠️ Vui lòng nhập yêu cầu chỉnh sửa',
            no_image_to_edit: '⚠️ Không có ảnh để chỉnh sửa',
            editing_image: '⏳ Đang chỉnh sửa ảnh...',
            edit_success: '✅ Đã chỉnh sửa thành công!',
            edit_error: '❌ Có lỗi xảy ra khi chỉnh sửa',
            refund_success: '✅ Đã hoàn trả gem! Xin lỗi vì kết quả không đúng 💎',
            result_deleted: 'Đã xóa kết quả',
            all_results_deleted: 'Đã xóa tất cả kết quả',
            cannot_open_popup: 'Không thể mở popup trên trang này',
            no_product_link: 'Không có link sản phẩm',
            opening_product: 'Đang mở trang sản phẩm...',
            copying_image: '🔄 Đang copy ảnh...',
            downloading: 'Đang tải về...',
            demo_mode_hint: 'Chế độ dùng thử: Bạn có 3 lượt thử miễn phí!',
            uploaded_image: 'Ảnh tải lên',
            local_upload: 'Đã tải lên',

            // Upload & Drag/Drop
            image_too_large: 'Ảnh quá lớn (tối đa 10MB)',
            select_image_file: 'Vui lòng chọn file ảnh',
            photo_added_success: 'Đã thêm ảnh',
            clothing_removed: 'Đã xóa ảnh quần áo',
            drop_image_file: 'Vui lòng thả file ảnh',
            model_photo_added: '✅ Đã thêm ảnh của bạn!',
            clothing_photo_added: '✅ Đã thêm ảnh quần áo!',
            press_t_to_try: '💡 Bấm T hoặc Enter để thử đồ',
            cannot_read_image: 'Không thể đọc ảnh',
            invalid_url: 'URL không hợp lệ. Phải bắt đầu bằng http:// hoặc https://',
            invalid_url_short: 'URL không hợp lệ',
            checking_image: '🔄 Đang kiểm tra ảnh...',
            image_added_success: '✅ Đã thêm ảnh thành công!',
            image_added_warning: 'Đã thêm ảnh. Nếu không hiển thị, hãy thử lưu ảnh về máy.',
            click_clothing_hint: 'Click vào ảnh quần áo trên trang web',
            select_all_images: 'Vui lòng chọn đủ ảnh',
            running_simulation: '🧪 Đang chạy chế độ giả lập...',
            tryon_success_popup: 'Thử đồ thành công! Popup đã mở.',
            processing_error: 'Có lỗi xảy ra khi xử lý',
            clothing_photo_selected: 'Đã chọn ảnh quần áo',
            opening_checkout: '🛒 Đang mở trang thanh toán...',
            cannot_download: 'Không thể tải về',
            outfit_saved: 'Đã lưu outfit!',
            outfit_save_error: 'Lỗi khi lưu outfit',
            demo_mode_toast: 'Chế độ dùng thử: Bạn có {count} lượt thử miễn phí!',
            cannot_enable_demo: 'Không thể bật chế độ dùng thử',
            report_wrong_btn: 'Ảnh sai? Hoàn gem 💎',
            report_done_btn: '✓ Đã hoàn gem',
            logout_error: 'Lỗi khi đăng xuất',
        },

        ja: {
            // Header
            gems: 'ジェム',
            balance: '残高',
            buy_gems: 'ジェムを購入',

            // Sections
            your_photo: 'あなたの写真',
            upload_photo: 'アップロード',
            select_below: '下から選択またはアップロード',
            saved_photos: '保存した写真',
            clothing: '服',
            paste_url: 'URLを貼り付け',
            right_click_hint: '服の画像を右クリックして試着',
            recent_clothing: '最近試着した服',
            clear_all: 'すべて削除',

            // Actions
            try_on_button: '試着する',
            tries_remaining: '回残り',
            need_more_gems: 'ジェムが不足',
            results: '結果',
            no_results: 'まだ結果がありません。試着して結果を確認してください。',
            copy_image: '画像をコピー',
            open_product: '商品ページを開く',
            rename: '名前を変更',
            delete: '削除',
            save_outfit: 'コーデを保存',
            download: 'ダウンロード',
            share: '共有',

            // Loading
            processing: 'コーディネートを作成中...',
            loading_tip: 'AIが数百万ピクセルを分析して完璧な結果を作成中！',
            finding_style: 'ぴったりのスタイルを探しています...',
            ai_working: 'AIスタイリストが魔法をかけています...',
            almost_done: 'もうすぐ完成、素敵です！',
            creating_look: 'あなたのルックを作成中...',
            mixing_colors: '美しく色を合わせています...',

            // Success/Error
            success: '試着成功！',
            error_generic: 'エラーが発生しました。もう一度お試しください。',
            error_insufficient_gems: 'ジェムが不足しています。購入してください。',
            error_network: 'ネットワークエラー。接続を確認してください。',

            // Auth
            login_to_try: 'ログインして試着・保存',
            continue_google: 'Googleで続行',
            not_logged_in: '未ログイン',

            // Settings
            language: '言語',
            shortcuts: 'ショートカット',
            changed_to: '日本語に変更しました',
            theme: 'テーマ',
            dark: 'ダーク',
            light: 'ライト',

            // Gems packages
            starter_pack: 'スターターパック',
            pro_pack: 'プロパック',
            premium_pack: 'プレミアムパック',
            popular: '人気',
            best_value: 'お得',
            payment_note: 'Stripeで安全にお支払い',

            // User models
            my_photos: 'マイ写真',
            add_photo: '写真を追加',
            set_default: 'デフォルトに設定',
            photo_added: '写真を追加しました',
            photo_deleted: '写真を削除しました',
            default_set: 'デフォルトの写真に設定しました',

            // Clothing history
            clothing_selected: '服を選択しました',
            clothing_saved: 'コレクションに保存しました！',
            quick_try: 'クイック試着',
            has_product_link: '商品リンクあり',

            // Popups
            popup_opened: 'ポップアップを開きました',
            popup_closed: 'ポップアップを閉じました',
            result_saved: '結果を保存しました！',
            copied_to_clipboard: 'コピーしました！LINEなどに貼り付けできます',
            could_not_copy: 'コピーできませんでした',

            // Time
            just_now: 'たった今',
            minutes_ago: '{count}分前',
            hours_ago: '{count}時間前',
            days_ago: '{count}日前',
            weeks_ago: '{count}週間前',
            months_ago: '{count}ヶ月前',
        },

        ko: {
            // Header
            gems: '젬',
            balance: '잔액',
            buy_gems: '젬 구매',

            // Sections
            your_photo: '내 사진',
            upload_photo: '업로드',
            select_below: '아래에서 선택 또는 업로드',
            saved_photos: '저장된 사진',
            clothing: '옷',
            paste_url: 'URL 붙여넣기',
            right_click_hint: '옷 이미지를 우클릭하여 피팅',
            recent_clothing: '최근 피팅',
            clear_all: '모두 삭제',

            // Actions
            try_on_button: '피팅하기',
            tries_remaining: '회 남음',
            need_more_gems: '젬 부족',
            results: '결과',
            no_results: '아직 결과가 없습니다. 피팅해서 결과를 확인하세요.',
            copy_image: '이미지 복사',
            open_product: '상품 페이지 열기',
            rename: '이름 변경',
            delete: '삭제',
            save_outfit: '코디 저장',
            download: '다운로드',
            share: '공유',

            // Loading
            processing: '코디 생성 중...',
            loading_tip: 'AI가 수백만 픽셀을 분석하여 완벽한 결과를 만들고 있어요!',
            finding_style: '완벽한 스타일을 찾는 중...',
            ai_working: 'AI 스타일리스트가 마법을 부리는 중...',
            almost_done: '거의 완성! 멋져요!',
            creating_look: '당신의 룩을 만드는 중...',
            mixing_colors: '아름답게 색을 조합하는 중...',

            // Success/Error
            success: '피팅 성공!',
            error_generic: '오류가 발생했습니다. 다시 시도해 주세요.',
            error_insufficient_gems: '젬이 부족합니다. 구매해 주세요.',
            error_network: '네트워크 오류. 연결을 확인해 주세요.',

            // Auth
            login_to_try: '로그인하여 피팅 & 저장',
            continue_google: 'Google로 계속',
            not_logged_in: '로그인되지 않음',

            // Settings
            language: '언어',
            shortcuts: '단축키',
            changed_to: '한국어로 변경되었습니다',
            theme: '테마',
            dark: '다크',
            light: '라이트',

            // Gems packages
            starter_pack: '스타터 팩',
            pro_pack: '프로 팩',
            premium_pack: '프리미엄 팩',
            popular: '인기',
            best_value: '최고 가성비',
            payment_note: 'Stripe로 안전한 결제',

            // User models
            my_photos: '내 사진',
            add_photo: '사진 추가',
            set_default: '기본으로 설정',
            photo_added: '사진이 추가되었습니다',
            photo_deleted: '사진이 삭제되었습니다',
            default_set: '기본 사진으로 설정되었습니다',

            // Clothing history
            clothing_selected: '옷이 선택되었습니다',
            clothing_saved: '컬렉션에 저장되었습니다!',
            quick_try: '빠른 피팅',
            has_product_link: '상품 링크 있음',

            // Popups
            popup_opened: '팝업이 열렸습니다',
            popup_closed: '팝업이 닫혔습니다',
            result_saved: '결과가 저장되었습니다!',
            copied_to_clipboard: '복사되었습니다! 카카오톡 등에 붙여넣기 하세요',
            could_not_copy: '복사할 수 없습니다',

            // Time
            just_now: '방금 전',
            minutes_ago: '{count}분 전',
            hours_ago: '{count}시간 전',
            days_ago: '{count}일 전',
            weeks_ago: '{count}주 전',
            months_ago: '{count}개월 전',
        },

        zh: {
            // Header
            gems: '宝石',
            balance: '余额',
            buy_gems: '购买宝石',

            // Sections
            your_photo: '你的照片',
            upload_photo: '上传',
            select_below: '从下方选择或上传',
            saved_photos: '已保存的照片',
            clothing: '服装',
            paste_url: '粘贴链接',
            right_click_hint: '右键点击服装图片进行试穿',
            recent_clothing: '最近试穿',
            clear_all: '清空',

            // Actions
            try_on_button: '试穿',
            tries_remaining: '次剩余',
            need_more_gems: '宝石不足',
            results: '结果',
            no_results: '暂无结果。试穿衣服来查看结果。',
            copy_image: '复制图片',
            open_product: '打开商品页面',
            rename: '重命名',
            delete: '删除',
            save_outfit: '保存穿搭',
            download: '下载',
            share: '分享',

            // Loading
            processing: '正在生成搭配...',
            loading_tip: 'AI正在分析数百万像素以创建完美结果！',
            finding_style: '正在寻找完美风格...',
            ai_working: 'AI造型师正在施展魔法...',
            almost_done: '快好了，看起来很棒！',
            creating_look: '正在为您打造造型...',
            mixing_colors: '正在美丽地搭配颜色...',

            // Success/Error
            success: '试穿成功！',
            error_generic: '出现错误。请重试。',
            error_insufficient_gems: '宝石不足。请购买更多。',
            error_network: '网络错误。请检查连接。',

            // Auth
            login_to_try: '登录以试穿和保存',
            continue_google: '使用Google登录',
            not_logged_in: '未登录',

            // Settings
            language: '语言',
            shortcuts: '快捷键',
            changed_to: '已切换到中文',
            theme: '主题',
            dark: '深色',
            light: '浅色',

            // Gems packages
            starter_pack: '入门套餐',
            pro_pack: '专业套餐',
            premium_pack: '高级套餐',
            popular: '热门',
            best_value: '最划算',
            payment_note: '通过Stripe安全支付',

            // User models
            my_photos: '我的照片',
            add_photo: '添加照片',
            set_default: '设为默认',
            photo_added: '已添加照片',
            photo_deleted: '已删除照片',
            default_set: '已设为默认照片',

            // Clothing history
            clothing_selected: '已选择服装',
            clothing_saved: '已保存到收藏！',
            quick_try: '快速试穿',
            has_product_link: '有商品链接',

            // Popups
            popup_opened: '已打开弹窗',
            popup_closed: '已关闭弹窗',
            result_saved: '已保存结果！',
            copied_to_clipboard: '已复制！可粘贴到微信等',
            could_not_copy: '无法复制',

            // Time
            just_now: '刚刚',
            minutes_ago: '{count}分钟前',
            hours_ago: '{count}小时前',
            days_ago: '{count}天前',
            weeks_ago: '{count}周前',
            months_ago: '{count}个月前',
        },

        th: {
            // Header
            gems: 'เพชร',
            balance: 'ยอดคงเหลือ',
            buy_gems: 'ซื้อเพชร',

            // Sections
            your_photo: 'รูปของคุณ',
            upload_photo: 'อัปโหลด',
            select_below: 'เลือกจากด้านล่างหรืออัปโหลด',
            saved_photos: 'รูปที่บันทึก',
            clothing: 'เสื้อผ้า',
            paste_url: 'วาง URL',
            right_click_hint: 'คลิกขวาที่รูปเสื้อผ้าเพื่อลอง',
            recent_clothing: 'ลองล่าสุด',
            clear_all: 'ลบทั้งหมด',

            // Actions
            try_on_button: 'ลองสวม',
            tries_remaining: 'ครั้งที่เหลือ',
            need_more_gems: 'เพชรไม่พอ',
            results: 'ผลลัพธ์',
            no_results: 'ยังไม่มีผลลัพธ์ ลองสวมเสื้อผ้าเพื่อดูผลลัพธ์',
            copy_image: 'คัดลอกรูป',
            open_product: 'เปิดหน้าสินค้า',
            rename: 'เปลี่ยนชื่อ',
            delete: 'ลบ',
            save_outfit: 'บันทึกชุด',
            download: 'ดาวน์โหลด',
            share: 'แชร์',

            // Loading
            processing: 'กำลังสร้างชุด...',
            loading_tip: 'AI กำลังวิเคราะห์พิกเซลหลายล้านเพื่อสร้างผลลัพธ์ที่สมบูรณ์แบบ!',
            finding_style: 'กำลังหาสไตล์ที่ลงตัว...',
            ai_working: 'AI สไตลิสต์กำลังทำเวทมนตร์...',
            almost_done: 'เกือบเสร็จแล้ว สวยมาก!',
            creating_look: 'กำลังสร้างลุคให้คุณ...',
            mixing_colors: 'กำลังผสมสีอย่างสวยงาม...',

            // Success/Error
            success: 'ลองสำเร็จ!',
            error_generic: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
            error_insufficient_gems: 'เพชรไม่พอ กรุณาซื้อเพิ่ม',
            error_network: 'ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ',

            // Auth
            login_to_try: 'เข้าสู่ระบบเพื่อลองและบันทึก',
            continue_google: 'ดำเนินการด้วย Google',
            not_logged_in: 'ยังไม่ได้เข้าสู่ระบบ',

            // Settings
            language: 'ภาษา',
            shortcuts: 'ปุ่มลัด',
            changed_to: 'เปลี่ยนเป็นภาษาไทยแล้ว',
            theme: 'ธีม',
            dark: 'มืด',
            light: 'สว่าง',

            // Gems packages
            starter_pack: 'แพ็คเริ่มต้น',
            pro_pack: 'แพ็คโปร',
            premium_pack: 'แพ็คพรีเมียม',
            popular: 'ยอดนิยม',
            best_value: 'คุ้มค่าที่สุด',
            payment_note: 'ชำระเงินปลอดภัยผ่าน Stripe',

            // User models
            my_photos: 'รูปของฉัน',
            add_photo: 'เพิ่มรูป',
            set_default: 'ตั้งเป็นค่าเริ่มต้น',
            photo_added: 'เพิ่มรูปแล้ว',
            photo_deleted: 'ลบรูปแล้ว',
            default_set: 'ตั้งเป็นรูปเริ่มต้นแล้ว',

            // Clothing history
            clothing_selected: 'เลือกเสื้อผ้าแล้ว',
            clothing_saved: 'บันทึกลงคอลเลกชันแล้ว!',
            quick_try: 'ลองเร็ว',
            has_product_link: 'มีลิงก์สินค้า',

            // Popups
            popup_opened: 'เปิดป็อปอัพแล้ว',
            popup_closed: 'ปิดป็อปอัพแล้ว',
            result_saved: 'บันทึกผลลัพธ์แล้ว!',
            copied_to_clipboard: 'คัดลอกแล้ว! วางใน LINE ได้เลย',
            could_not_copy: 'ไม่สามารถคัดลอกได้',

            // Time
            just_now: 'เมื่อกี้',
            minutes_ago: '{count} นาทีที่แล้ว',
            hours_ago: '{count} ชั่วโมงที่แล้ว',
            days_ago: '{count} วันที่แล้ว',
            weeks_ago: '{count} สัปดาห์ที่แล้ว',
            months_ago: '{count} เดือนที่แล้ว',
        },

        id: {
            // Header
            gems: 'gem',
            balance: 'Saldo',
            buy_gems: 'Beli Gem',

            // Sections
            your_photo: 'Foto Anda',
            upload_photo: 'Unggah',
            select_below: 'Pilih dari bawah atau unggah',
            saved_photos: 'Foto Tersimpan',
            clothing: 'Pakaian',
            paste_url: 'Tempel URL',
            right_click_hint: 'Klik kanan pada gambar pakaian untuk mencoba',
            recent_clothing: 'Baru Dicoba',
            clear_all: 'Hapus Semua',

            // Actions
            try_on_button: 'Coba Pakai',
            tries_remaining: 'percobaan tersisa',
            need_more_gems: 'Gem tidak cukup',
            results: 'Hasil',
            no_results: 'Belum ada hasil. Coba pakaian untuk melihat hasil.',
            copy_image: 'Salin gambar',
            open_product: 'Buka halaman produk',
            rename: 'Ganti nama',
            delete: 'Hapus',
            save_outfit: 'Simpan outfit',
            download: 'Unduh',
            share: 'Bagikan',

            // Loading
            processing: 'Membuat outfit...',
            loading_tip: 'AI sedang menganalisis jutaan piksel untuk menciptakan hasil yang sempurna!',
            finding_style: 'Mencari gaya yang sempurna...',
            ai_working: 'AI stylist sedang bekerja...',
            almost_done: 'Hampir selesai, terlihat cantik!',
            creating_look: 'Membuat tampilan Anda...',
            mixing_colors: 'Memadukan warna dengan indah...',

            // Success/Error
            success: 'Berhasil!',
            error_generic: 'Terjadi kesalahan. Silakan coba lagi.',
            error_insufficient_gems: 'Gem tidak cukup. Silakan beli lebih banyak.',
            error_network: 'Kesalahan jaringan. Periksa koneksi Anda.',

            // Auth
            login_to_try: 'Masuk untuk mencoba & menyimpan',
            continue_google: 'Lanjutkan dengan Google',
            not_logged_in: 'Belum masuk',

            // Settings
            language: 'Bahasa',
            shortcuts: 'Pintasan',
            changed_to: 'Diubah ke Bahasa Indonesia',
            theme: 'Tema',
            dark: 'Gelap',
            light: 'Terang',

            // Gems packages
            starter_pack: 'Paket Pemula',
            pro_pack: 'Paket Pro',
            premium_pack: 'Paket Premium',
            popular: 'Populer',
            best_value: 'Nilai Terbaik',
            payment_note: 'Pembayaran aman via Stripe',

            // User models
            my_photos: 'Foto Saya',
            add_photo: 'Tambah Foto',
            set_default: 'Atur sebagai default',
            photo_added: 'Foto ditambahkan',
            photo_deleted: 'Foto dihapus',
            default_set: 'Diatur sebagai foto default',

            // Clothing history
            clothing_selected: 'Pakaian dipilih',
            clothing_saved: 'Disimpan ke koleksi!',
            quick_try: 'Coba cepat',
            has_product_link: 'Ada link produk',

            // Popups
            popup_opened: 'Popup dibuka',
            popup_closed: 'Popup ditutup',
            result_saved: 'Hasil disimpan!',
            copied_to_clipboard: 'Tersalin! Tempel ke WhatsApp dll',
            could_not_copy: 'Tidak dapat menyalin',

            // Time
            just_now: 'Baru saja',
            minutes_ago: '{count} menit yang lalu',
            hours_ago: '{count} jam yang lalu',
            days_ago: '{count} hari yang lalu',
            weeks_ago: '{count} minggu yang lalu',
            months_ago: '{count} bulan yang lalu',
        },

        es: {
            // Header
            gems: 'gemas',
            balance: 'Saldo',
            buy_gems: 'Comprar Gemas',

            // Sections
            your_photo: 'Tu Foto',
            upload_photo: 'Subir',
            select_below: 'Selecciona abajo o sube',
            saved_photos: 'Fotos Guardadas',
            clothing: 'Ropa',
            paste_url: 'Pegar URL',
            right_click_hint: 'Clic derecho en la imagen para probar',
            recent_clothing: 'Probado Recientemente',
            clear_all: 'Borrar Todo',

            // Actions
            try_on_button: 'Probar',
            tries_remaining: 'pruebas restantes',
            need_more_gems: 'Necesitas más gemas',
            results: 'Resultados',
            no_results: 'Aún no hay resultados. Prueba ropa para ver los resultados.',
            copy_image: 'Copiar imagen',
            open_product: 'Abrir página del producto',
            rename: 'Renombrar',
            delete: 'Eliminar',
            save_outfit: 'Guardar outfit',
            download: 'Descargar',
            share: 'Compartir',

            // Loading
            processing: 'Creando tu outfit...',
            loading_tip: '¡La IA está analizando millones de píxeles para crear el resultado perfecto!',
            finding_style: 'Buscando el estilo perfecto...',
            ai_working: 'El estilista AI está haciendo magia...',
            almost_done: '¡Casi listo, te ves fabuloso!',
            creating_look: 'Creando tu look...',
            mixing_colors: 'Combinando colores hermosamente...',

            // Success/Error
            success: '¡Prueba exitosa!',
            error_generic: 'Algo salió mal. Por favor, inténtalo de nuevo.',
            error_insufficient_gems: 'Gemas insuficientes. Por favor, compra más.',
            error_network: 'Error de red. Verifica tu conexión.',

            // Auth
            login_to_try: 'Inicia sesión para probar y guardar',
            continue_google: 'Continuar con Google',
            not_logged_in: 'No conectado',

            // Settings
            language: 'Idioma',
            shortcuts: 'Atajos',
            changed_to: 'Cambiado a Español',
            theme: 'Tema',
            dark: 'Oscuro',
            light: 'Claro',

            // Gems packages
            starter_pack: 'Pack Inicial',
            pro_pack: 'Pack Pro',
            premium_pack: 'Pack Premium',
            popular: 'Popular',
            best_value: 'Mejor Valor',
            payment_note: 'Pago seguro vía Stripe',

            // User models
            my_photos: 'Mis Fotos',
            add_photo: 'Añadir Foto',
            set_default: 'Establecer como predeterminado',
            photo_added: 'Foto añadida',
            photo_deleted: 'Foto eliminada',
            default_set: 'Establecida como foto predeterminada',

            // Clothing history
            clothing_selected: 'Ropa seleccionada',
            clothing_saved: '¡Guardado en colección!',
            quick_try: 'Prueba rápida',
            has_product_link: 'Tiene enlace de producto',

            // Popups
            popup_opened: 'Popup abierto',
            popup_closed: 'Popup cerrado',
            result_saved: '¡Resultado guardado!',
            copied_to_clipboard: '¡Copiado! Pega en WhatsApp, etc.',
            could_not_copy: 'No se pudo copiar',

            // Time
            just_now: 'Ahora mismo',
            minutes_ago: 'hace {count} minutos',
            hours_ago: 'hace {count} horas',
            days_ago: 'hace {count} días',
            weeks_ago: 'hace {count} semanas',
            months_ago: 'hace {count} meses',
        },

        fr: {
            // Header
            gems: 'gemmes',
            balance: 'Solde',
            buy_gems: 'Acheter des Gemmes',

            // Sections
            your_photo: 'Votre Photo',
            upload_photo: 'Télécharger',
            select_below: 'Sélectionnez ci-dessous ou téléchargez',
            saved_photos: 'Photos Enregistrées',
            clothing: 'Vêtement',
            paste_url: 'Coller URL',
            right_click_hint: 'Clic droit sur l\'image pour essayer',
            recent_clothing: 'Essayés Récemment',
            clear_all: 'Tout Effacer',

            // Actions
            try_on_button: 'Essayer',
            tries_remaining: 'essais restants',
            need_more_gems: 'Plus de gemmes nécessaires',
            results: 'Résultats',
            no_results: 'Pas encore de résultats. Essayez des vêtements pour voir les résultats.',
            copy_image: 'Copier l\'image',
            open_product: 'Ouvrir la page produit',
            rename: 'Renommer',
            delete: 'Supprimer',
            save_outfit: 'Enregistrer la tenue',
            download: 'Télécharger',
            share: 'Partager',

            // Loading
            processing: 'Création de votre tenue...',
            loading_tip: 'L\'IA analyse des millions de pixels pour créer le résultat parfait !',
            finding_style: 'Recherche du style parfait...',
            ai_working: 'Le styliste IA fait sa magie...',
            almost_done: 'Presque fini, ça a l\'air fabuleux !',
            creating_look: 'Création de votre look...',
            mixing_colors: 'Association harmonieuse des couleurs...',

            // Success/Error
            success: 'Essai réussi !',
            error_generic: 'Une erreur s\'est produite. Veuillez réessayer.',
            error_insufficient_gems: 'Gemmes insuffisantes. Veuillez en acheter.',
            error_network: 'Erreur réseau. Vérifiez votre connexion.',

            // Auth
            login_to_try: 'Connectez-vous pour essayer et sauvegarder',
            continue_google: 'Continuer avec Google',
            not_logged_in: 'Non connecté',

            // Settings
            language: 'Langue',
            shortcuts: 'Raccourcis',
            changed_to: 'Changé en Français',
            theme: 'Thème',
            dark: 'Sombre',
            light: 'Clair',

            // Gems packages
            starter_pack: 'Pack Débutant',
            pro_pack: 'Pack Pro',
            premium_pack: 'Pack Premium',
            popular: 'Populaire',
            best_value: 'Meilleur Rapport',
            payment_note: 'Paiement sécurisé via Stripe',

            // User models
            my_photos: 'Mes Photos',
            add_photo: 'Ajouter Photo',
            set_default: 'Définir par défaut',
            photo_added: 'Photo ajoutée',
            photo_deleted: 'Photo supprimée',
            default_set: 'Définie comme photo par défaut',

            // Clothing history
            clothing_selected: 'Vêtement sélectionné',
            clothing_saved: 'Enregistré dans la collection !',
            quick_try: 'Essai rapide',
            has_product_link: 'A un lien produit',

            // Popups
            popup_opened: 'Popup ouvert',
            popup_closed: 'Popup fermé',
            result_saved: 'Résultat enregistré !',
            copied_to_clipboard: 'Copié ! Collez dans Messenger, etc.',
            could_not_copy: 'Impossible de copier',

            // Time
            just_now: 'À l\'instant',
            minutes_ago: 'il y a {count} minutes',
            hours_ago: 'il y a {count} heures',
            days_ago: 'il y a {count} jours',
            weeks_ago: 'il y a {count} semaines',
            months_ago: 'il y a {count} mois',
        },
    };

    // =====================================================
    // TRANSLATION FUNCTION
    // =====================================================

    /**
     * Get translation for a key
     * @param {string} key - Translation key
     * @param {string} locale - Locale code
     * @param {object} vars - Variables for interpolation
     * @returns {string}
     */
    function t(key, locale = DEFAULT_LOCALE, vars = {}) {
        const translation = TRANSLATIONS[locale]?.[key] || TRANSLATIONS[DEFAULT_LOCALE]?.[key] || key;

        // Interpolate variables
        if (vars && typeof translation === 'string') {
            return translation.replace(/\{(\w+)\}/g, (_, varName) => String(vars[varName] ?? ''));
        }

        return translation;
    }

    // =====================================================
    // CURRENCY FORMATTING
    // =====================================================

    /**
     * Format a price in the appropriate currency for the locale
     * @param {number} amount - Amount in VND (base currency)
     * @param {string} locale - Target locale
     * @returns {string} Formatted price string
     */
    function formatCurrency(amount, locale = DEFAULT_LOCALE) {
        const config = CURRENCY_CONFIG[locale] || CURRENCY_CONFIG[DEFAULT_LOCALE];

        // Convert from VND to target currency (approximate rates)
        const convertedAmount = convertFromVND(amount, config.code);

        // Format number
        let formatted = formatNumber(convertedAmount, config.decimals, config.separator, config.decimal);

        // Add currency symbol
        if (config.position === 'before') {
            return `${config.symbol}${formatted}`;
        } else {
            return `${formatted} ${config.symbol}`;
        }
    }

    /**
     * Convert amount from VND to target currency
     * These are approximate exchange rates - in production, use a real API
     */
    function convertFromVND(amountVND, targetCurrency) {
        const rates = {
            VND: 1,
            USD: 0.00004,      // 1 USD ≈ 25,000 VND
            JPY: 0.006,        // 1 JPY ≈ 170 VND
            KRW: 0.053,        // 1 KRW ≈ 19 VND
            CNY: 0.00029,      // 1 CNY ≈ 3,500 VND
            THB: 0.0014,       // 1 THB ≈ 700 VND
            IDR: 0.64,         // 1 IDR ≈ 1.56 VND
            EUR: 0.000037,     // 1 EUR ≈ 27,000 VND
        };

        return amountVND * (rates[targetCurrency] || 1);
    }

    /**
     * Format a number with thousands separator and decimal places
     */
    function formatNumber(num, decimals, separator, decimalChar) {
        const fixed = num.toFixed(decimals);
        const parts = fixed.split('.');

        // Add thousands separator
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

        if (decimals > 0 && parts[1]) {
            return parts[0] + decimalChar + parts[1];
        }

        return parts[0];
    }

    /**
     * Format price in VND (for Vietnamese locale specifically)
     * @param {number} amount - Amount in VND
     * @returns {string}
     */
    function formatPriceVND(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    }

    // =====================================================
    // TIME AGO FORMATTING
    // =====================================================

    /**
     * Format a timestamp to "time ago" string
     * @param {string|number|Date} timestamp
     * @param {string} locale
     * @returns {string}
     */
    function formatTimeAgo(timestamp, locale = DEFAULT_LOCALE) {
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();

        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);

        if (minutes < 1) return t('just_now', locale);
        if (minutes < 60) return t('minutes_ago', locale, { count: minutes });
        if (hours < 24) return t('hours_ago', locale, { count: hours });
        if (days < 7) return t('days_ago', locale, { count: days });
        if (weeks < 5) return t('weeks_ago', locale, { count: weeks });
        return t('months_ago', locale, { count: months });
    }

    // =====================================================
    // LOADING MESSAGES
    // =====================================================

    const LOADING_MESSAGES = {
        en: [
            'Finding the perfect fit... ✨',
            'AI stylist is working magic... 🪄',
            'Almost there, looking fabulous! 💫',
            'Creating your look... 👗',
            'Mixing colors beautifully... 🎨',
        ],
        vi: [
            'Đang tìm phong cách hoàn hảo... ✨',
            'AI stylist đang làm phép... 🪄',
            'Sắp xong rồi, đẹp lắm! 💫',
            'Đang tạo look cho bạn... 👗',
            'Đang phối màu thật đẹp... 🎨',
        ],
        ja: [
            'ぴったりのスタイルを探しています... ✨',
            'AIスタイリストが魔法をかけています... 🪄',
            'もうすぐ完成、素敵です！ 💫',
            'あなたのルックを作成中... 👗',
            '美しく色を合わせています... 🎨',
        ],
        ko: [
            '완벽한 스타일을 찾는 중... ✨',
            'AI 스타일리스트가 마법을 부리는 중... 🪄',
            '거의 완성! 멋져요! 💫',
            '당신의 룩을 만드는 중... 👗',
            '아름답게 색을 조합하는 중... 🎨',
        ],
        zh: [
            '正在寻找完美风格... ✨',
            'AI造型师正在施展魔法... 🪄',
            '快好了，看起来很棒！ 💫',
            '正在为您打造造型... 👗',
            '正在美丽地搭配颜色... 🎨',
        ],
        th: [
            'กำลังหาสไตล์ที่ลงตัว... ✨',
            'AI สไตลิสต์กำลังทำเวทมนตร์... 🪄',
            'เกือบเสร็จแล้ว สวยมาก! 💫',
            'กำลังสร้างลุคให้คุณ... 👗',
            'กำลังผสมสีอย่างสวยงาม... 🎨',
        ],
        id: [
            'Mencari gaya yang sempurna... ✨',
            'AI stylist sedang bekerja... 🪄',
            'Hampir selesai, terlihat cantik! 💫',
            'Membuat tampilan Anda... 👗',
            'Memadukan warna dengan indah... 🎨',
        ],
        es: [
            'Buscando el estilo perfecto... ✨',
            'El estilista AI está haciendo magia... 🪄',
            '¡Casi listo, te ves fabuloso! 💫',
            'Creando tu look... 👗',
            'Combinando colores hermosamente... 🎨',
        ],
        fr: [
            'Recherche du style parfait... ✨',
            'Le styliste IA fait sa magie... 🪄',
            'Presque fini, ça a l\'air fabuleux ! 💫',
            'Création de votre look... 👗',
            'Association harmonieuse des couleurs... 🎨',
        ],
    };

    /**
     * Get loading message for locale
     * @param {number} index
     * @param {string} locale
     * @returns {string}
     */
    function getLoadingMessage(index, locale = DEFAULT_LOCALE) {
        const messages = LOADING_MESSAGES[locale] || LOADING_MESSAGES[DEFAULT_LOCALE];
        return messages[index % messages.length];
    }

    // =====================================================
    // STORAGE HELPERS
    // =====================================================

    /**
     * Save locale preference to storage
     */
    async function saveLocalePreference(locale) {
        try {
            await chrome.storage.local.set({ extension_locale: locale });
            return true;
        } catch (e) {
            console.error('Failed to save locale preference:', e);
            return false;
        }
    }

    /**
     * Load locale preference from storage
     */
    async function loadLocalePreference() {
        try {
            const data = await chrome.storage.local.get('extension_locale');
            if (data.extension_locale && SUPPORTED_LOCALES.includes(data.extension_locale)) {
                return data.extension_locale;
            }

            // Fallback to browser language
            const browserLang = navigator.language?.split('-')[0];
            if (SUPPORTED_LOCALES.includes(browserLang)) {
                return browserLang;
            }

            return DEFAULT_LOCALE;
        } catch (e) {
            console.error('Failed to load locale preference:', e);
            return DEFAULT_LOCALE;
        }
    }

    // =====================================================
    // EXPOSE TO WINDOW
    // =====================================================

    window.i18n = {
        SUPPORTED_LOCALES,
        DEFAULT_LOCALE,
        LOCALE_INFO,
        CURRENCY_CONFIG,
        TRANSLATIONS,
        LOADING_MESSAGES,
        t,
        formatCurrency,
        formatPriceVND,
        formatTimeAgo,
        getLoadingMessage,
        saveLocalePreference,
        loadLocalePreference,
    };

})(); // End IIFE
