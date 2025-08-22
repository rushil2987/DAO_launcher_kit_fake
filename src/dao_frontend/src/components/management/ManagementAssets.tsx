
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Upload, Download, File, Loader2, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useAssets } from '../../hooks/useAssets';
import { DAO } from '../../types/dao';
import Toast from '../Toast';

const ManagementAssets: React.FC = () => {
  const { dao } = useOutletContext<{ dao: DAO }>();

  const { getUserAssets, getPublicAssets, uploadAsset, getAsset, deleteAsset, getStorageStats } = useAssets();
  const [assets, setAssets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    setRefreshing(true);
    try {
      const [userAssets, publicAssets, storageStats] = await Promise.all([
        getUserAssets(),
        getPublicAssets(),
        getStorageStats(),
      ]);
      const userIds = new Set(userAssets.map((a: any) => Number(a.id)));
      const combined = [
        ...userAssets,
        ...publicAssets.filter((a: any) => !userIds.has(Number(a.id))),
      ];
      setAssets(combined);
      setStats(storageStats);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load assets' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 10 : p));
    }, 200);
    
    try {
      await uploadAsset(file, true, []);
      setUploadProgress(100);
      setToast({ type: 'success', message: 'Asset uploaded successfully!' });
      await fetchAssets();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to upload asset' });
    } finally {
      clearInterval(interval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (id: bigint) => {
    try {
      const asset = await getAsset(id);
      const blob = new Blob([new Uint8Array(asset.data)], {
        type: asset.contentType,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = asset.name;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Asset downloaded successfully!' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to download asset' });
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      await deleteAsset(id);
      setToast({ type: 'success', message: 'Asset deleted successfully!' });
      await fetchAssets();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete asset' });
    }
  };

  const handleView = async (id: bigint) => {
    try {
      const asset = await getAsset(id);
      const blob = new Blob([new Uint8Array(asset.data)], {
        type: asset.contentType,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to view asset' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return (
    <div className="space-y-8">
      {/* Storage Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 font-mono">STORAGE OVERVIEW</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{Number(stats.totalAssets)}</p>
              <p className="text-sm text-gray-400 font-mono">Total Assets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{formatFileSize(Number(stats.storageUsed))}</p>
              <p className="text-sm text-gray-400 font-mono">Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{formatFileSize(Number(stats.storageAvailable))}</p>
              <p className="text-sm text-gray-400 font-mono">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{formatFileSize(Number(stats.averageFileSize))}</p>
              <p className="text-sm text-gray-400 font-mono">Avg Size</p>
            </div>
          </div>
          
          {/* Storage Usage Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 font-mono">Storage Usage</span>
              <span className="text-blue-400 font-bold">
                {Math.round((Number(stats.storageUsed) / Number(stats.storageLimit)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(Number(stats.storageUsed) / Number(stats.storageLimit)) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 font-mono">ASSETS</h2>
          <p className="text-gray-400">
            Manage digital assets and files for {dao.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchAssets}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-all font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Asset</span>
              </>
            )}
          </motion.button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploadProgress > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 h-2 bg-gray-700 rounded">
              <div
                className="h-full bg-green-500 rounded"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>


      {assets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center"
        >
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2 font-mono">
            NO ASSETS AVAILABLE
          </h3>
          <p className="text-gray-400 mb-6">
            Upload files to start building your asset library.
          </p>
        </motion.div>
      ) : (
        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {assets.map((asset: any) => (
            <motion.li
              key={Number(asset.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <File className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-white font-mono">{asset.name}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>{asset.contentType}</span>
                    <span>•</span>
                    <span>{formatFileSize(Number(asset.size))}</span>
                    <span>•</span>
                    <span>{asset.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {asset.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleView(asset.id)}
                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="View Asset"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(asset.id)}
                  className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-colors"
                  title="Download Asset"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Delete Asset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ManagementAssets;

