'use client';

import { useState, useEffect } from 'react';
import { FaYoutube } from 'react-icons/fa';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  image_path: string;
  youtube_url: string;
}

export default function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    image: null as File | null,
    youtubeUrl: '',
  });
  const [youtubeError, setYoutubeError] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:8000/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('❌ Failed to load products:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'image' && files) {
      setFormData({ ...formData, image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === 'youtubeUrl') {
        const id = getYouTubeId(value);
        setYoutubeError(id ? '' : '⚠️ Invalid YouTube URL');
      }
    }
  };

  const getYouTubeId = (url: string) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      const pathname = parsed.pathname;

      if (hostname.includes('youtu.be')) {
        return pathname.slice(1);
      } else if (pathname.startsWith('/shorts/')) {
        return pathname.split('/')[2];
      } else {
        return parsed.searchParams.get('v') || pathname.split('/').pop();
      }
    } catch {
      return '';
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;

    const headers = ['ID', 'Name', 'Price', 'Stock', 'Image Path', 'YouTube URL'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.price,
      p.stock,
      p.image_path,
      p.youtube_url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (column: 'name' | 'price' | 'stock') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      image: null,
      youtubeUrl: product.youtube_url,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formPayload = new FormData();
    formPayload.append('name', formData.name);
    formPayload.append('price', formData.price);
    formPayload.append('stock', formData.stock);
    formPayload.append('youtubeUrl', formData.youtubeUrl);
    if (formData.image) {
      formPayload.append('image', formData.image);
    }

    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct
      ? `http://localhost:8000/products/${editingProduct.id}`
      : 'http://localhost:8000/products';

    try {
      const res = await fetch(url, {
        method,
        body: formPayload,
      });

      if (!res.ok) {
        const err = await res.text();
        alert('❌ Failed to save product:\n' + err);
        return;
      }

      alert(editingProduct ? '✅ Product updated' : '✅ Product added');
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', stock: '', image: null, youtubeUrl: '' });
      fetchProducts();
    } catch (err) {
      alert('Error while saving product.');
      console.error(err);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortBy) return 0;
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });

  const filteredProducts = sortedProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="p-8 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">🧊 Product Management</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={exportToCSV}
        >
          📤 Export CSV
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search by product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border border-gray-600 rounded bg-gray-800 text-white"
        />
      </div>

      <button
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={() => {
          setEditingProduct(null);
          setFormData({ name: '', price: '', stock: '', image: null, youtubeUrl: '' });
          setShowModal(true);
        }}
      >
        ➕ Add Product
      </button>

      <div className="flex justify-end mb-2">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={async () => {
            const confirmDeleteAll = confirm("Are you sure you want to delete ALL products?");
            if (!confirmDeleteAll) return;

            try {
              const res = await fetch('http://localhost:8000/products', {
                method: 'DELETE',
              });

              if (!res.ok) {
                const err = await res.text();
                alert('❌ Failed to delete all:\n' + err);
                return;
              }

              alert('🧹 All products deleted');
              fetchProducts();
            } catch (err) {
              alert('Error while deleting all products.');
              console.error(err);
            }
          }}
        >
          🗑️ Delete All
        </button>
      </div>

      {imagePreviewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImagePreviewUrl(null)}
        >
          <img src={imagePreviewUrl} alt="Full Preview" className="max-w-full max-h-full rounded shadow-lg" />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 overflow-y-auto bg-black bg-opacity-50 z-10">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="bg-white text-black p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Cube'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Product Name"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Price"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  name="stock"
                  type="number"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="Stock"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.image && (
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="w-full mt-2 rounded"
                  />
                )}
                <input
                  name="youtubeUrl"
                  value={formData.youtubeUrl}
                  onChange={handleChange}
                  placeholder="YouTube Review URL"
                  className="w-full px-3 py-2 border rounded"
                />
                {formData.youtubeUrl && (
                  <div className="mt-2">
                    <iframe
                      className="w-full aspect-video rounded"
                      src={`https://www.youtube.com/embed/${getYouTubeId(formData.youtubeUrl)}`}
                      allowFullScreen
                    ></iframe>
                    {youtubeError && <p className="text-red-500 text-sm mt-1">{youtubeError}</p>}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {editingProduct ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <table className="w-full table-auto border border-gray-700">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 border cursor-pointer" onClick={() => handleSort('name')}>
              Product {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort('price')}>
              Price {sortBy === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => handleSort('stock')}>
              Stock {sortBy === 'stock' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map((product) => (
            <tr key={product.id} className="text-center text-gray-200">
              <td className="p-2 border">
                <div className="flex items-center gap-3 justify-center">
                  <img
                    src={`http://localhost:8000/uploads/${product.image_path}`}
                    alt={product.name}
                    className="w-10 h-10 rounded object-cover border cursor-pointer"
                    onClick={() => setImagePreviewUrl(`http://localhost:8000/uploads/${product.image_path}`)}
                  />
                  <span>{product.name}</span>
                  {product.youtube_url && (
                    <a
                      href={product.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 text-xl hover:scale-110 transition"
                    >
                      <FaYoutube />
                    </a>
                  )}
                </div>
              </td>
              <td className="p-2 border">৳{product.price.toFixed(2)}</td>
              <td className="p-2 border">
                {product.stock <= 5 ? (
                  <span className="text-red-500 font-semibold">🔻 {product.stock}</span>
                ) : (
                  product.stock
                )}
              </td>
              <td className="p-2 border">
                <button className="text-blue-400 hover:underline mr-2" onClick={() => startEditing(product)}>
                  Edit
                </button>
                <button
                  className="text-red-400 hover:underline"
                  onClick={async () => {
                    const confirmDelete = confirm(`Are you sure you want to delete "${product.name}"?`);
                    if (!confirmDelete) return;

                    try {
                      const res = await fetch(`http://localhost:8000/products/${product.id}`, {
                        method: 'DELETE',
                      });

                      if (!res.ok) {
                        const err = await res.text();
                        alert('❌ Failed to delete:\n' + err);
                        return;
                      }

                      alert('🗑️ Product deleted successfully');
                      fetchProducts();
                    } catch (err) {
                      alert('Error while deleting product.');
                      console.error(err);
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4">
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>

        <span className="text-white">
          {`Page ${currentPage} of ${totalPages}`}
        </span>

        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}

