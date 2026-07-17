import SwiftUI

struct ContentView: View {
    @StateObject private var model = BrowserViewModel()
    @FocusState private var urlFieldFocused: Bool

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 8) {
                faviconArea
                    .frame(height: geometry.size.height / 2)

                Text(model.pageTitle)
                    .font(.headline)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 16)

                TextField("URL を入力", text: $model.urlText)
                    .font(.footnote)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.go)
                    .focused($urlFieldFocused)
                    .onSubmit {
                        model.navigate(to: model.urlText)
                        urlFieldFocused = false
                    }
                    .padding(.horizontal, 16)

                WebView(webView: model.webView)
            }
        }
        .onChange(of: urlFieldFocused) { _, focused in
            model.isEditingURL = focused
        }
    }

    /// 上半分いっぱいに favicon をドット絵のまま（補間なしで）拡大表示する
    private var faviconArea: some View {
        Group {
            if let favicon = model.favicon {
                Image(uiImage: favicon)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "globe")
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(16)
    }
}

#Preview {
    ContentView()
}
