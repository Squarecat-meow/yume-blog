import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="font-sans">
      <ul className="flex items-center gap-4">
        <li>
          <Link href={"/"}>Home</Link>
        </li>
        <li>
          <Link href={"/post"}>Post</Link>
        </li>
        <li>
          <Link href={"/novel"}>Novel</Link>
        </li>
        <li>
          <Link href={"/gallery"}>Gallery</Link>
        </li>
        <li>
          <Link href={"/contact"}>Contact</Link>
        </li>
      </ul>
    </nav>
  );
}
