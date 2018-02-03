export default function textMatchesPatterns(text: any, patterns: any): false | {
    keyword: string;
    match?: undefined;
} | {
    keyword: RegExp;
    match: any;
};
