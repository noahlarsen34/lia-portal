const WORDPRESS_BASE_URL = "https://program.latinosinaction.org/wp-json/wp/v2";

export type WordPressContentType = "page" | "post";

export type WordPressRenderedContent = {
    id: number;
    link: string;
    slug: string;
    type: WordPressContentType;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    excerpt?: {
        rendered: string;
    };
};

export type WordPressSearchResult = {
    id: number;
    title: string;
    url: string;
    type: "post";
    subtype: WordPressContentType;
};

export async function getWordPressPage(id: string | number) {
    return getWordPressContent("page", id);
}

export async function getWordPressPost(id: string | number) {
    return getWordPressContent("post", id);
}

export async function getWordPressContent(
    type: WordPressContentType,
    id: string | number,
): Promise<WordPressRenderedContent | null> {
    const idValue = String(id);
    const isNumericId = /^\d+$/.test(idValue);

    async function fecthWordPressContent(contentType: WordPressContentType) {
        const endpoint = contentType === "page" ? "pages" : "posts";
        const url = isNumericId
            ? `${WORDPRESS_BASE_URL}/${endpoint}/${idValue}`
            : `${WORDPRESS_BASE_URL}/${endpoint}?slug=${encodeURIComponent(idValue)}`;

        const response = await fetch(url, {
            next: {
                revalidate: 300,
            },
        });

        if(!response.ok) {
            return null;
        }

        const data = await response.json();

        if(Array.isArray(data)) {
            return data[0] ?? null;
        }

        return data;
    }

    const content = await fecthWordPressContent(type);

    if (content || isNumericId) {
        return content;
    }
    
    return fecthWordPressContent(type === "page" ? "post" : "page");
}

export async function getWordPressPostsByCategory(
    categoryId: number,
): Promise<WordPressRenderedContent[]> {
    const response = await fetch(
        `${WORDPRESS_BASE_URL}/posts?categories=${categoryId}&per_page=100&page=1`,
        {
            next: {
                revalidate: 300,
            },
        },
    );

    if (!response.ok) {
        return [];
    }

    return response.json() as Promise<WordPressRenderedContent[]>;
}

export async function searchWordPress(
    query: string,
): Promise<WordPressSearchResult[]> {
    const searchParams = new URLSearchParams({
        search: query,
        per_page: "20",
    });

    const response = await fetch(`${WORDPRESS_BASE_URL}/search?${searchParams}`, {
        next: {
            revalidate: 300,
        },
    });

    if (!response.ok) {
        return [];
    }

    return response.json() as Promise<WordPressSearchResult[]>;
}
