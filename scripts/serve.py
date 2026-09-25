"""Local/LAN server with byte ranges for Safari video seeking. No dependencies."""
import argparse, functools, os, pathlib, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range=None
        path=self.translate_path(self.path)
        if not os.path.isfile(path) or 'Range' not in self.headers:
            return super().send_head()
        match=re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers['Range'])
        size=os.path.getsize(path)
        if not match or not size or not any(match.groups()):
            self.send_error(416,'Invalid range');return None
        a,b=match.groups()
        start=int(a) if a else max(0,size-int(b))
        end=min(int(b),size-1) if a and b else size-1
        if start>end or start>=size:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
        stream=open(path,'rb');stream.seek(start);self.byte_range=(start,end)
        self.send_response(206);self.send_header('Content-Type',self.guess_type(path));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers();return stream
    def end_headers(self):
        self.send_header('Accept-Ranges','bytes')
        if self.path.endswith(('.html','.js','.css')) or self.path=='/':self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def copyfile(self,source,outputfile):
        if self.byte_range is None:return super().copyfile(source,outputfile)
        remaining=self.byte_range[1]-self.byte_range[0]+1
        try:
            while remaining:
                chunk=source.read(min(65536,remaining))
                if not chunk:break
                outputfile.write(chunk);remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError):pass
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8766);parser.add_argument('--bind',default='127.0.0.1');args=parser.parse_args()
    print(f'Exercises: http://{args.bind}:{args.port}',flush=True)
    ThreadingHTTPServer((args.bind,args.port),functools.partial(Handler,directory=str(ROOT))).serve_forever()
